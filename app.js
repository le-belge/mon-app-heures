firebase.initializeApp({
  apiKey: "AIzaSyBSnnmaodnDOqIzRZdTsZeOJlGjmmo0_dk",
  authDomain: "pointage-heures.firebaseapp.com",
  projectId: "pointage-heures"
});
const db = firebase.firestore();

let currentUser = "";
let codeToName = {};

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("codeInput").addEventListener("keydown", e => { 
    if (e.key === "Enter") connecter(); 
  });
  remplirSelectSemaines();
  remplirTypeJours();
  await chargerOuvriers();
});

async function chargerOuvriers() {
  const snapshot = await db.collection("ouvriers").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    codeToName[doc.id] = data.nom || doc.id;
  });
}

function remplirSelectSemaines() {
  for (let i = 23; i <= 52; i++) {
    ["semaineSelect","semaineAdminSelect"].forEach(id=>{
      let select = document.getElementById(id);
      let option = document.createElement("option");
      option.text = "S" + i;
      option.value = "S" + i;
      select.add(option);
    });
  }
}

function remplirTypeJours() {
  ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"].forEach(jour => {
    let select = document.getElementById("type"+jour);
    ["","Congé","Formation","Maladie","Férié"].forEach(v=>{
      let opt = document.createElement("option");
      opt.value = v;
      opt.text = v;
      select.add(opt);
    });
  });
}

function connecter() {
  const code = document.getElementById("codeInput").value.trim();
  currentUser = codeToName[code] || code;
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appPage").style.display = "block";
  document.getElementById("welcome").textContent = currentUser;

  if(code === "admin08110") {
    document.getElementById("adminPage").style.display = "block";
    chargerRecapAdmin();
  } else {
    document.getElementById("workerPage").style.display = "block";
    chargerDates();
    chargerHeures();
  }
}

function chargerDates() {
  let semaine = parseInt(document.getElementById("semaineSelect").value.substring(1));
  let today = new Date();
  today.setMonth(0);
  today.setDate(1 + (semaine-1)*7);
  for(let i=0;i<7;i++){
    let d = new Date(today);
    d.setDate(today.getDate() + i);
    document.getElementById("date"+["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"][i]).textContent = d.toLocaleDateString();
  }
}

async function chargerHeures() {
  chargerDates();
  const semaine = document.getElementById("semaineSelect").value;
  const snapshot = await db.collection("heures")
    .where("ouvrier", "==", currentUser)
    .where("semaine", "==", semaine)
    .orderBy("timestamp", "desc")
    .limit(1)
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
    const parts = val.split(":");
    if(parts.length == 2){
      const num = parseInt(parts[0]) + parseInt(parts[1])/60;
      if (!isNaN(num)) total += num;
    }
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

async function ajouterOuvrier() {
  const code = document.getElementById("newCode").value.trim();
  const nom = document.getElementById("newName").value.trim();
  if (code && nom) {
    await db.collection("ouvriers").doc(code).set({ nom: nom });
    codeToName[code] = nom;
    alert(`Ajouté: ${code} → ${nom}`);
  }
}

function deconnecter() {
  location.reload();
}
