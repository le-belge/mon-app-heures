firebase.initializeApp({
  apiKey: "AIzaSyBSnnmaodnDOqIzRZdTsZeOJlGjmmo0_dk",
  authDomain: "pointage-heures.firebaseapp.com",
  projectId: "pointage-heures"
});
const db = firebase.firestore();

let currentUser = "";
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
  remplirDates();
  remplirSelectSemaines();
});

function remplirDates() {
  const today = new Date();
  for(let i=0;i<7;i++){
    let d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + 1 + i);
    let jour = ["dateLundi","dateMardi","dateMercredi","dateJeudi","dateVendredi","dateSamedi","dateDimanche"];
    document.getElementById(jour[i]).textContent = d.toLocaleDateString();
  }
}

function remplirSelectSemaines() {
  const s = ["S23","S24","S25","S26"];
  s.forEach(sem => {
    document.getElementById("semaineSelect").innerHTML += `<option>${sem}</option>`;
    document.getElementById("semaineAdminSelect").innerHTML += `<option>${sem}</option>`;
  });
}

function connecter() {
  const code = document.getElementById("codeInput").value.trim();
  currentUser = codeToName[code] || code;
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appPage").style.display = "block";
  document.getElementById("welcome").textContent = currentUser;
  if(code === "admin08110"){
    document.getElementById("adminPage").style.display = "block";
    chargerRecapAdmin();
  } else {
    document.getElementById("workerPage").style.display = "block";
    chargerHeures();
  }
}

async function chargerHeures() {
  const semaine = document.getElementById("semaineSelect").value;
  const snapshot = await db.collection("heures")
    .where("ouvrier", "==", currentUser)
    .where("semaine", "==", semaine)
    .get();
  if (!snapshot.empty) {
    const data = snapshot.docs[0].data();
    ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(jour => {
      document.getElementById(jour).value = data[jour] || "";
    });
    afficherRecap(data.total, data.delta);
  } else {
    ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(jour => {
      document.getElementById(jour).value = "";
    });
    afficherRecap("0.00", "-40.00");
  }
}

function afficherRecap(total, delta) {
  document.getElementById("recap").textContent = `Total: ${total} h | Delta: ${delta} h`;
}

async function sauver() {
  const semaine = document.getElementById("semaineSelect").value;
  let total = 0;
  let data = { ouvrier: currentUser, semaine: semaine, timestamp: new Date() };
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
  const semaine = document.getElementById("semaineAdminSelect").value;
  const snapshot = await db.collection("heures").where("semaine", "==", semaine).get();
  let html = "<table><tr><th>Ouvrier</th><th>Lundi</th><th>Mardi</th><th>Mercredi</th><th>Jeudi</th><th>Vendredi</th><th>Samedi</th><th>Dimanche</th><th>Total</th><th>Delta</th></tr>";
  snapshot.forEach(doc => {
    const d = doc.data();
    html += `<tr><td>${d.ouvrier}</td><td>${d.lundi||""}</td><td>${d.mardi||""}</td><td>${d.mercredi||""}</td><td>${d.jeudi||""}</td><td>${d.vendredi||""}</td><td>${d.samedi||""}</td><td>${d.dimanche||""}</td><td>${d.total}</td><td>${d.delta}</td></tr>`;
  });
  html += "</table>";
  document.getElementById("adminContent").innerHTML = html;
}

function deconnecter() {
  location.reload();
}

function exporterCSV() {
  let csv = "Ouvrier,Lundi,Mardi,Mercredi,Jeudi,Vendredi,Samedi,Dimanche,Total,Delta\n";
  document.querySelectorAll("#adminContent table tr").forEach((tr,i) => {
    if(i==0) return;
    let tds = tr.querySelectorAll("td");
    csv += Array.from(tds).map(td=>td.innerText).join(",")+"\n";
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `admin_recap.csv`;
  link.click();
}
