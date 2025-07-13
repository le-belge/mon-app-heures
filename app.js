// --- Initialisation Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyBSnnmaodnDOqIzRZdTsZeOJlGjmmo0_dk",
  authDomain: "pointage-heures.firebaseapp.com",
  projectId: "pointage-heures"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- UTILITAIRES ---
function semaineNumero(date) {
  // Calcule le n° de semaine de l’année (ex : S27)
  const dt = new Date(date.getTime());
  dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate() + 4 - (dt.getDay()||7));
  const debutAnnee = new Date(dt.getFullYear(),0,1);
  const numSemaine = Math.ceil((((dt - debutAnnee) / 86400000) + 1) / 7);
  return "S" + numSemaine;
}
function getSemaineEnCours() {
  return semaineNumero(new Date());
}
function getMoisEnCours() {
  const now = new Date();
  return ("0"+(now.getMonth()+1)).slice(-2) + "/" + now.getFullYear();
}
function formatHeures(h) {
  // Affiche 8:30 au lieu de 8.5
  const heures = Math.floor(h);
  const minutes = Math.round((h-heures)*60);
  return `${heures}:${minutes.toString().padStart(2,"0")}`;
}

// --- LOGIN LOGIQUE ---
let currentUser = null;
let currentOuvrier = null;

document.getElementById('btnLogin').onclick = tryLogin;
document.getElementById('codeInput').addEventListener('keypress', function(e){
  if(e.key === "Enter") tryLogin();
});
document.getElementById('btnLogout').onclick = function() {
  location.reload();
};

async function tryLogin() {
  const code = document.getElementById('codeInput').value.trim();
  document.getElementById('login-error').textContent = '';
  if (!code) return;
  // Vérifie code dans /ouvriers
  const ouvSnap = await db.collection("ouvriers").where("code","==",code).get();
  if (ouvSnap.empty) {
    document.getElementById('login-error').textContent = "Code invalide.";
    return;
  }
  currentOuvrier = ouvSnap.docs[0].data();
  currentUser = code;
  document.getElementById('login').style.display = "none";
  document.getElementById('zone-app').style.display = "block";
  document.getElementById('btnLogout').style.display = "inline-block";
  document.getElementById('welcome').innerHTML = `Bienvenue <b>${currentOuvrier.nom}</b>`;
  afficherRecapOuvrier(currentUser);
}

// --- RÉCAP OUVRIER ---
async function afficherRecapOuvrier(codeOuvrier) {
  document.getElementById('recap-ouvrier').style.display = 'block';
  // Charge toutes les semaines dispo
  const semaines = await getSemainesPourOuvrier(codeOuvrier);
  const semaineEnCours = getSemaineEnCours();
  remplirSelectPeriode(semaines, semaineEnCours);

  document.getElementById('periodeSelect').onchange = () => updateRecapOuvrier(codeOuvrier);
  document.getElementById('btnExport').onclick = () => exportRecapOuvrier(codeOuvrier);
  document.getElementById('btnPrint').onclick = () => window.print();

  // Affiche direct la semaine en cours
  updateRecapOuvrier(codeOuvrier);
}

async function getSemainesPourOuvrier(codeOuvrier) {
  const heuresSnap = await db.collection("heures").where("code", "==", codeOuvrier).get();
  const semaines = new Set();
  heuresSnap.forEach(doc => {
    if(doc.data().semaine) semaines.add(doc.data().semaine);
  });
  return Array.from(semaines).sort((a,b)=>a.localeCompare(b));
}

function remplirSelectPeriode(semaines, semaineEnCours) {
  const select = document.getElementById('periodeSelect');
  select.innerHTML = "";
  // Ajoute aussi "Ce mois" tout en haut
  const moisOpt = document.createElement("option");
  moisOpt.value = "mois";
  moisOpt.text = "Ce mois";
  select.appendChild(moisOpt);

  semaines.forEach(s=>{
    const opt = document.createElement("option");
    opt.value = s;
    opt.text = s + (s === semaineEnCours ? " (en cours)" : "");
    select.appendChild(opt);
  });
  select.value = semaineEnCours;
}

async function updateRecapOuvrier(codeOuvrier) {
  const periode = document.getElementById('periodeSelect').value;
  let rows = [];
  if(periode === "mois") {
    // Charge toutes les semaines du mois en cours
    const mois = getMoisEnCours();
    const heuresSnap = await db.collection("heures").where("code", "==", codeOuvrier).get();
    heuresSnap.forEach(doc => {
      const d = doc.data();
      if (d.timestamp) {
        const date = new Date(d.timestamp.seconds*1000);
        const moisDoc = ("0"+(date.getMonth()+1)).slice(-2) + "/" + date.getFullYear();
        if (moisDoc === mois) rows.push(d);
      }
    });
  } else {
    // Semaine spécifique
    const heuresSnap = await db.collection("heures")
      .where("code", "==", codeOuvrier)
      .where("semaine", "==", periode)
      .get();
    heuresSnap.forEach(doc => rows.push(doc.data()));
  }

  // Prépare le tableau
  let html = `<table><tr><th>Semaine</th><th>Heures</th><th>Maladie</th><th>Congé</th><th>Formation</th></tr>`;
  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;
  rows.forEach(row => {
    // Parcourt les jours et comptes les statuts
    let semaineHeures = 0, semaineMaladie = 0, semaineConge = 0, semaineFormation = 0;
    ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(jour => {
      const val = row[jour];
      if(!val) return;
      if(val === "Maladie") semaineMaladie++;
      else if(val === "Congé") semaineConge++;
      else if(val === "Formation") semaineFormation++;
      else if(/^\d{1,2}:\d{2}$/.test(val)) {
        const [h,m] = val.split(":").map(Number);
        semaineHeures += h + m/60;
      }
    });
    totalHeures += semaineHeures;
    maladie += semaineMaladie;
    conge += semaineConge;
    formation += semaineFormation;
    html += `<tr><td>${row.semaine||""}</td><td>${formatHeures(semaineHeures)}</td><td>${semaineMaladie}</td><td>${semaineConge}</td><td>${semaineFormation}</td></tr>`;
  });
  html += `<tr style="font-weight:bold"><td>Total</td><td>${formatHeures(totalHeures)}</td><td>${maladie}</td><td>${conge}</td><td>${formation}</td></tr></table>`;
  document.getElementById('tableRecapContainer').innerHTML = html;
}

// --- Export CSV (simple) ---
function exportRecapOuvrier(codeOuvrier) {
  const html = document.getElementById('tableRecapContainer').innerHTML;
  if (!html) return;
  // Convertit le tableau HTML en CSV brut
  const rows = Array.from(document.querySelectorAll('#tableRecapContainer table tr'));
  const csv = rows.map(row => Array.from(row.children).map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(";")).join("\n");
  // Télécharge le fichier
  const blob = new Blob([csv], {type:'text/csv'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'recap-heures.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
