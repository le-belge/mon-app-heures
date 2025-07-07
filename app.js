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
let currentWeek = "S" + getWeekNumber(new Date());

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
    currentUser = docSnap.data().nom;
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("welcome").textContent = `Bienvenue ${currentUser}`;
    loadWeekData();
  } else {
    document.getElementById("loginError").textContent = "Identifiant inconnu.";
  }
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
    if(heure && !isNaN(parseFloat(heure.replace(":", ".")))) total += parseFloat(heure.replace(":", "."));
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
}

function updateSummary(total) {
  const summary = document.getElementById("summaryContainer");
  let delta = (total - 40).toFixed(2);
  summary.innerHTML = `<p><strong>Total semaine :</strong> ${total.toFixed(2)} h (${delta >=0 ? "+" : ""}${delta}h)</p>`;
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
  loadWeekData();
}
