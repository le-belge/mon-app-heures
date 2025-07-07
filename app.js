firebase.initializeApp({
  apiKey: "TON_API_KEY",
  authDomain: "TON_PROJECT_ID.firebaseapp.com",
  projectId: "TON_PROJECT_ID"
});
const db = firebase.firestore();

let currentUser = "";
let currentWeek = "";

// 🔒 Mapping anonymisé - à remplacer dans ton projet local
const codeToName = {
  "codeAdmin": "Admin",
  "codeBen": "Ben",
  "codeMarc": "Marc",
  "codeMika": "Mika",
  "codeOlivier": "Olivier",
  "codeRenaud": "Renaud"
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("codeInput").addEventListener("keydown", e => { 
    if (e.key === "Enter") connecter(); 
  });
});

function connecter() {
  const code = document.getElementById("codeInput").value.trim();
  if (!code) return;
  currentUser = codeToName[code] || code;
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appPage").style.display = "block";
  document.getElementById("sessionInfo").textContent = `Bienvenue ${currentUser}`;
  
  if (code !== "codeAdmin") {
    document.getElementById("adminAdd").style.display = "none";
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

function deconnecter() {
  location.reload();
}

function exporterCSV() {
  let csv = "Jour,Heures\n";
  ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(jour => {
    csv += `${jour},${document.getElementById(jour).value.trim()}\n`;
  });
  const recapText = document.getElementById("recap").textContent;
  csv += `Total et Delta,${recapText}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${currentUser}_${currentWeek}.csv`;
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
