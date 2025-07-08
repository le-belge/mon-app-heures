firebase.initializeApp({
  apiKey: "AIzaSyBSnnmaodnDOqIzRZdTsZeOJlGjmmo0_dk",
  authDomain: "pointage-heures.firebaseapp.com",
  projectId: "pointage-heures",
  storageBucket: "pointage-heures.firebaseapp.com",
  messagingSenderId: "392363086555",
  appId: "1:392363086555:web:6bfe7f166214443e86b2fe"
});
const db = firebase.firestore();

let currentUser = "";
let currentWeek = "";
const codeToName = {
  "admin08110": "Admin",
  "nm08110": "Mika",
  "lm08110": "Marc",
  "ba08110": "Ben",
  "do08110": "Olivier",
  "ra08110": "Renaud"
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("codeInput").addEventListener("keydown", e => { 
    if (e.key === "Enter") connecter(); 
  });
});

async function connecter() {
  const code = document.getElementById("codeInput").value.trim();
  if (!code) return;
  currentUser = codeToName[code] || code;
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appPage").style.display = "block";

  if (code === "admin08110") {
    document.getElementById("adminPage").style.display = "block";
    chargerRecapAdmin();
  } else {
    document.getElementById("workerPage").style.display = "block";
    document.getElementById("sessionInfo").textContent = `Bienvenue ${currentUser}`;
    if (code !== "admin08110") document.getElementById("adminAdd").style.display = "none";
  }
}

async function chargerHeures() {
  currentWeek = document.getElementById("semaineInput").value.trim();
  if (!currentWeek) return;
  const snapshot = await db.collection("heures")
    .where("ouvrier", "==", currentUser)
    .where("semaine", "==", currentWeek)
    .get();
  if (!snapshot.empty) {
    const data = snapshot.docs[0].data();
    remplirInputs(data);
    afficherRecap(data.total, data.delta);
  } else {
    remplirInputs({});
    afficherRecap("0.00", "-40.00");
  }
}

function remplirInputs(data) {
  ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(jour => {
    document.getElementById(jour).value = data[jour] || "";
  });
}

function afficherRecap(total, delta) {
  document.getElementById("recap").textContent = `Total: ${total} h | Delta: ${delta} h`;
}

async function sauver() {
  let total = 0;
  let data = { ouvrier: currentUser, semaine: currentWeek, timestamp: new Date() };
  ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(jour => {
    const val = document.getElementById(jour).value.trim();
    data[jour] = val;
    const num = parseFloat(val.replace(":", "."));
    if (!isNaN(num)) total += num;
  });
  data.total = total.toFixed(2);
  data.delta = (total - 40).toFixed(2);
  await db.collection("heures").add(data);
  afficherRecap(data.total, data.delta);
}

async function chargerRecapAdmin() {
  const snapshot = await db.collection("heures").get();
  let html = "<table><tr><th>Ouvrier</th><th>Semaine</th><th>Total</th><th>Delta</th></tr>";
  snapshot.forEach(doc => {
    const d = doc.data();
    html += `<tr><td>${d.ouvrier}</td><td>${d.semaine}</td><td>${d.total}</td><td>${d.delta}</td></tr>`;
  });
  html += "</table>";
  document.getElementById("adminContent").innerHTML = html;
}

function deconnecter() {
  location.reload();
}

function exporterCSV() {
  let csv = "Ouvrier,Semaine,Total,Delta\n";
  document.querySelectorAll("#adminContent table tr").forEach((tr,i) => {
    if(i==0) return;
    let tds = tr.querySelectorAll("td");
    csv += `${tds[0].innerText},${tds[1].innerText},${tds[2].innerText},${tds[3].innerText}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `admin_recap.csv`;
  link.click();
}

function ajouterOuvrier() {
  const code = document.getElementById("newCode").value.trim();
  const nom = document.getElementById("newName").value.trim();
  if (code && nom) {
    codeToName[code] = nom;
    alert(`Ajouté: ${code} → ${nom}`);
  }
}
