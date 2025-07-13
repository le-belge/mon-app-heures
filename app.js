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
  afficherRecapOuvrier(currentOuvrier.nom);
}

// --- RÉCAP OUVRIER ---
async function afficherRecapOuvrier(nomOuvrier) {
  document.getElementById('recap-ouvrier').style.display = 'block';
  const semaines = await getSemainesPourOuvrier(nomOuvrier);
  const semaineEnCours = getSemaineEnCours();
  remplirSelectPeriode(semaines, semaineEnCours);

  document.getElementById('periodeSelect').onchange = () => updateRecapOuvrier(nomOuvrier);
  document.getElementById('btnExport').onclick = () => exportRecapOuvrier(nomOuvrier);
  document.getElementById('btnPrint').onclick = () => window.print();

  updateRecapOuvrier(nomOuvrier);
}

async function getSemainesPourOuvrier(nomOuvrier) {
  const heuresSnap = await db.collection("heures")
    .where("ouvrier", "==", nomOuvrier)
    .get();
  const semaines = new Set();
  heuresSnap.forEach(doc => {
    if(doc.data().semaine) semaines.add(doc.data().semaine);
  });
  return Array.from(semaines).sort((a,b)=>a.localeCompare(b));
}

function remplirSelectPeriode(semaines, semaineEnCours) {
  const select = document.getElementById('periodeSelect');
  select.innerHTML = "";
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

async function updateRecapOuvrier(nomOuvrier) {
  const periode = document.getElementById('periodeSelect').value;
  let rows = [];
  if(periode === "mois") {
    const mois = getMoisEnCours();
    const heuresSnap = await db.collection("heures").where("ouvrier", "==", nomOuvrier).get();
    heuresSnap.forEach(doc => {
      const d = doc.data();
      if (d.timestamp) {
        const date = new Date(d.timestamp.seconds*1000);
        const moisDoc = ("0"+(date.getMonth()+1)).slice(-2) + "/" + date.getFullYear();
        if (moisDoc === mois) rows.push(d);
      }
    });
  } else {
    const heuresSnap = await db.collection("heures")
      .where("ouvrier", "==", nomOuvrier)
      .where("semaine", "==", periode)
      .get();
    heuresSnap.forEach(doc => rows.push(doc.data()));
  }

  let html = `<table>
    <tr>
      <th>Semaine</th>
      <th>Lundi</th>
      <th>Mardi</th>
      <th>Mercredi</th>
      <th>Jeudi</th>
      <th>Vendredi</th>
      <th>Samedi</th>
      <th>Dimanche</th>
      <th>Total</th>
      <th>Maladie</th>
      <th>Congé</th>
      <th>Formation</th>
    </tr>`;
  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;

  rows.forEach(row => {
    let semaineHeures = 0, semaineMaladie = 0, semaineConge = 0, semaineFormation = 0;
    let jours = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
    let joursHtml = "";
    jours.forEach(jour => {
      const val = row[jour] || "";
      if(val === "Maladie") semaineMaladie++;
      else if(val === "Congé") semaineConge++;
      else if(val === "Formation") semaineFormation++;
      else if(/^\d{1,2}:\d{2}$/.test(val)) {
        const [h,m] = val.split(":").map(Number);
        semaineHeures += h + m/60;
      }
      joursHtml += `<td>${val}</td>`;
    });
    totalHeures += semaineHeures;
    maladie += semaineMaladie;
    conge += semaineConge;
    formation += semaineFormation;
    html += `<tr>
      <td>${row.semaine||""}</td>
      ${joursHtml}
      <td><b>${formatHeures(semaineHeures)}</b></td>
      <td>${semaineMaladie}</td>
      <td>${semaineConge}</td>
      <td>${semaineFormation}</td>
    </tr>`;
  });

  html += `<tr class="total-row">
    <td><b>TOTAL</b></td>
    <td colspan="7"></td>
    <td><b>${formatHeures(totalHeures)}</b></td>
    <td><b>${maladie}</b></td>
    <td><b>${conge}</b></td>
    <td><b>${formation}</b></td>
  </tr>
  </table>`;
  document.getElementById('tableRecapContainer').innerHTML = html;
}

// --- Export CSV (amélioré) ---
function exportRecapOuvrier(nomOuvrier) {
  const html = document.getElementById('tableRecapContainer').innerHTML;
  if (!html) return;
  const rows = Array.from(document.querySelectorAll('#tableRecapContainer table tr'));
  const csv = rows.map(row => Array.from(row.children).map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], {type:'text/csv'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'recap-heures.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

