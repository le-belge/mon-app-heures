import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBSnnmaodnDOqIzRZdTsZeOJlGjmmo0_dk",
  authDomain: "pointage-heures.firebaseapp.com",
  projectId: "pointage-heures",
  storageBucket: "pointage-heures.firebasestorage.app",
  messagingSenderId: "392363086555",
  appId: "1:392363086555:web:6bfe7f166214443e86b2fe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const days = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
let currentUser = "";
let currentUserDisplay = "";
let currentWeek = "S" + getWeekNumber(new Date());

document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("currentUser");
  const savedDisplay = localStorage.getItem("currentUserDisplay");
  if (savedUser && savedDisplay) {
    currentUser = savedUser;
    currentUserDisplay = savedDisplay;
    showApp();
    loadWeekData();
  }
});

document.getElementById("password").addEventListener("keydown", e => {
  if (e.key === "Enter") checkLogin();
});

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

async function checkLogin() {
  const code = document.getElementById("password")?.value.trim();
  const docSnap = await getDoc(doc(db, "ouvriers", code));
  if(docSnap.exists()) {
    currentUser = code;
    currentUserDisplay = docSnap.data().nom;
    localStorage.setItem("currentUser", currentUser);
    localStorage.setItem("currentUserDisplay", currentUserDisplay);
    showApp();
    loadWeekData();
  } else {
    document.getElementById("loginError").textContent = "Identifiant inconnu.";
  }
}

function showApp() {
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("welcome").textContent = `Bienvenue ${currentUserDisplay}`;
}

async function loadWeekData() {
  const tableContainer = document.getElementById("tablesContainer");
  const commentBox = document.getElementById("commentaire");
  let html = `<table><tr><th>Jour</th><th>Heures</th><th>Absence</th></tr>`;
  let total = 0;

  const weekRef = collection(db, "heures");
  const q = query(weekRef, where("ouvrier", "==", currentUser), where("semaine", "==", currentWeek));
  const querySnap = await getDocs(q);
  let dataWeek = {};
  querySnap.forEach(doc => dataWeek[doc.data().jour] = doc.data());

  days.forEach(day => {
    const record = dataWeek[day] || {};
    let heure = record.heure || "";
    let absence = record.absence || "";
    let hValue = heure.includes(":") ? parseFloat(heure.replace(":", ".")) : parseFloat(heure);
    if (!isNaN(hValue)) total += hValue;
    html += `<tr>
      <td>${day}</td>
      <td><input type="text" value="${heure}"></td>
      <td><input list="absences" value="${absence}"></td>
    </tr>`;
  });
  html += `</table>`;
  tableContainer.innerHTML = html;
  commentBox.value = (querySnap.docs[0]?.data().commentaire) || "";
  updateSummary(total);
  updateMonthlyRecap();
}

function updateSummary(total) {
  const summary = document.getElementById("summaryContainer");
  let delta = (total - 40).toFixed(2);
  summary.innerHTML = `<p><strong>Total semaine :</strong> ${total.toFixed(2)} h (${delta >=0 ? "+" : ""}${delta}h)</p>`;
}

async function updateMonthlyRecap() {
  const monthly = document.getElementById("monthlyContainer");
  const month = new Date().getMonth() + 1;
  const monthRef = collection(db, "heures");
  const q = query(monthRef, where("ouvrier", "==", currentUser));
  const querySnap = await getDocs(q);

  let totalMonth = 0;
  querySnap.forEach(doc => {
    const data = doc.data();
    if (data.semaine.startsWith("S")) {
      let h = data.heure;
      let hValue = h && h.includes(":") ? parseFloat(h.replace(":", ".")) : parseFloat(h);
      if (!isNaN(hValue)) totalMonth += hValue;
    }
  });

  monthly.innerHTML = `<p><strong>Total mois :</strong> ${totalMonth.toFixed(2)} h (pour 40h/semaine)</p>`;
}

async function saveData() {
  const rows = document.querySelectorAll("#tablesContainer table tr");
  let promises = [];
  rows.forEach((tr, idx) => {
    if(idx === 0) return;
    const day = days[idx - 1];
    const heure = tr.cells[1].querySelector("input").value;
    const absence = tr.cells[2].querySelector("input").value;
    const docRef = doc(db, "heures", `${currentUser}_${currentWeek}_${day}`);
    promises.push(setDoc(docRef, {
      ouvrier: currentUser,
      semaine: currentWeek,
      jour: day,
      heure: heure,
      absence: absence,
      commentaire: document.getElementById("commentaire").value || ""
    }));
  });
  await Promise.all(promises);
  loadWeekData(); // 🔥 rafraîchit les données sans re-login
}
