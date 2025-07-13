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
function getAllSemaines() {
  let semaines = [];
  for (let i = 23; i <= 52; i++) {
    semaines.push("S" + i);
  }
  return semaines;
}
function formatHeures(h) {
  const heures = Math.floor(h);
  const minutes = Math.round((h-heures)*60);
  return `${heures}:${minutes.toString().padStart(2,"0")}`;
}
function joursSemaineAvecDates(semaineStr) {
  let num = Number(semaineStr.replace("S", ""));
  if (!num || num < 1) num = semaineNumero(new Date());
  let year = (new Date()).getFullYear();
  let d = new Date(year, 0, 1 + (num-1)*7);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  let jours = [
    {label: "Lu", key: "lundi"},
    {label: "Ma", key: "mardi"},
    {label: "Me", key: "mercredi"},
    {label: "Je", key: "jeudi"},
    {label: "Ve", key: "vendredi"},
    {label: "Sa", key: "samedi"},
    {label: "Di", key: "dimanche"}
  ];
  return jours.map((j,i)=>{
    let dateObj = new Date(d.getTime());
    dateObj.setDate(d.getDate()+i);
    let dd = ("0"+dateObj.getDate()).slice(-2);
    let mm = ("0"+(dateObj.getMonth()+1)).slice(-2);
    return {...j, date: `${dd}/${mm}`};
  });
}

let currentUser = null;
let currentOuvrier = null;
let semainesGlobales = getAllSemaines();
let semaineCouranteIndex = 0;
let modeAdmin = false;

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
  modeAdmin = (code === "admin08110");
  document.getElementById('login').style.display = "none";
  document.getElementById('zone-app').style.display = "block";
  document.getElementById('btnLogout').style.display = "inline-block";
  document.getElementById('welcome').innerHTML = `Bienvenue <b>${currentOuvrier.nom}</b>`;
  if (modeAdmin) {
    document.getElementById('recap-ouvrier').style.display = "none";
    document.getElementById('recap-admin').style.display = "block";
    afficherRecapAdmin();
  } else {
    document.getElementById('recap-admin').style.display = "none";
    document.getElementById('recap-ouvrier').style.display = "block";
    afficherRecapOuvrier(currentOuvrier.nom);
  }
}

// --- OUVRIER ---
async function afficherRecapOuvrier(nomOuvrier) {
  const heuresSnap = await db.collection("heures").where("ouvrier", "==", nomOuvrier).get();
  let docsBySemaine = {};
  heuresSnap.forEach(doc => {
    const d = doc.data();
    if (d.semaine) docsBySemaine[d.semaine] = { ...d, id: doc.id };
  });
  let semaineEnCours = getSemaineEnCours();
  let indexEnCours = semainesGlobales.indexOf(semaineEnCours);
  if (indexEnCours === -1) indexEnCours = 0;
  semaineCouranteIndex = indexEnCours;
  renderSemaineSelect();
  updateRecapOuvrier(nomOuvrier, docsBySemaine);
}
function renderSemaineSelect() {
  const recapHeader = document.querySelector('.recap-header');
  recapHeader.innerHTML = `
    <label for="selectSemaine">Semaine :</label>
    <select id="selectSemaine">
      ${semainesGlobales.map((s,i)=>`<option value="${i}">${s}</option>`).join("")}
    </select>
    <button id="btnExport">Exporter</button>
    <button id="btnPrint">Imprimer</button>
    <button id="btnSave" class="btn-save">Sauvegarder</button>
    <span id="saveNotif"></span>
  `;
  document.getElementById('selectSemaine').value = semaineCouranteIndex;
  document.getElementById('selectSemaine').onchange = function() {
    semaineCouranteIndex = parseInt(this.value,10);
    afficherRecapOuvrier(currentOuvrier.nom);
  };
  document.getElementById('btnExport').onclick = () => exportRecapOuvrier(currentOuvrier.nom);
  document.getElementById('btnPrint').onclick = () => window.print();
  document.getElementById('btnSave').onclick = () => sauvegarderSemaine(currentOuvrier.nom);
}
function updateRecapOuvrier(nomOuvrier, docsBySemaine) {
  const semaine = semainesGlobales[semaineCouranteIndex];
  const joursSem = joursSemaineAvecDates(semaine);
  let row = docsBySemaine[semaine];

  let html = `<table>
    <tr>
      <th>Semaine</th>
      ${joursSem.map(j=>`<th>${j.label}<br><span style="font-size:0.87em;color:#555">${j.date}</span></th>`).join("")}
      <th>Total</th>
      <th>Mal</th>
      <th>Cng</th>
      <th>F</th>
    </tr>
    <tr>
      <td>${semaine}</td>`;
  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;
  joursSem.forEach(j => {
    let val = row && row[j.key] ? row[j.key] : "";
    html += `<td>${val ? val : ""}</td>`;
    if(val === "Maladie") maladie++;
    else if(val === "Congé") conge++;
    else if(val === "Formation") formation++;
    else if(/^\d{1,2}:\d{2}$/.test(val)) {
      const [h,m] = val.split(":").map(Number);
      totalHeures += h + m/60;
    }
  });
  html += `<td>${formatHeures(totalHeures)}</td>
    <td>${maladie}</td>
    <td>${conge}</td>
    <td>${formation}</td>
  </tr>
  </table>`;
  document.getElementById('tableRecapContainer').innerHTML = html;
}
async function sauvegarderSemaine(nomOuvrier) {
  // À adapter si tu veux la saisie des heures (inputs), pour l’instant lecture seule.
  // (Utilise ici ta logique d’édition/sauvegarde si tu veux rendre les cellules éditables)
}
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

// --- ADMIN ---
async function afficherRecapAdmin() {
  const ouvSnap = await db.collection("ouvriers").get();
  let ouvriers = ouvSnap.docs.map(doc => doc.data().nom);
  ouvriers = ouvriers.filter(o=>o).sort((a,b)=>a.localeCompare(b));
  const recapHeader = document.querySelector('.recap-header-admin');
  recapHeader.innerHTML = `
    <label for="selectSemaineAdmin">Semaine :</label>
    <select id="selectSemaineAdmin">
      ${semainesGlobales.map((s)=>`<option value="${s}">${s}</option>`).join("")}
    </select>
    <button id="btnExportAdmin">Exporter</button>
    <button id="btnPrintAdmin">Imprimer</button>
  `;
  document.getElementById('selectSemaineAdmin').onchange = function() {
    updateRecapAdminSimple(ouvriers);
  };
  document.getElementById('btnExportAdmin').onclick = () => exportRecapAdminSimple();
  document.getElementById('btnPrintAdmin').onclick = () => window.print();
  updateRecapAdminSimple(ouvriers);
}

async function updateRecapAdminSimple(ouvriers) {
  const semaine = document.getElementById('selectSemaineAdmin').value;
  const joursSem = joursSemaineAvecDates(semaine);
  const heuresSnap = await db.collection("heures").where("semaine","==",semaine).get();
  let docsByOuvrier = {};
  heuresSnap.forEach(doc => {
    const d = doc.data();
    if (d.ouvrier) docsByOuvrier[d.ouvrier] = [d];
  });
  let html = `<table>
    <tr>
      <th>Ouvrier</th>
      ${joursSem.map(j=>`<th>${j.label}<br><span style="font-size:0.87em;color:#555">${j.date}</span></th>`).join("")}
      <th>Total</th>
      <th>Mal</th>
      <th>Cng</th>
      <th>F</th>
    </tr>`;
  ouvriers.forEach(nomOuvrier => {
    let rows = docsByOuvrier[nomOuvrier] || [];
    let row = rows[0] || {};
    let totalHeures = 0, maladie = 0, conge = 0, formation = 0;
    html += `<tr><td>${nomOuvrier}</td>`;
    joursSem.forEach(j => {
      let val = row && row[j.key] ? row[j.key] : "";
      html += `<td>${val ? val : ""}</td>`;
      if(val === "Maladie") maladie++;
      else if(val === "Congé") conge++;
      else if(val === "Formation") formation++;
      else if(/^\d{1,2}:\d{2}$/.test(val)) {
        const [h,m] = val.split(":").map(Number);
        totalHeures += h + m/60;
      }
    });
    html += `<td>${formatHeures(totalHeures)}</td>
      <td>${maladie}</td>
      <td>${conge}</td>
      <td>${formation}</td>
    </tr>`;
  });
  html += `</table>`;
  document.getElementById('tableAdminContainer').innerHTML = html;
}
function exportRecapAdminSimple() {
  const html = document.getElementById('tableAdminContainer').innerHTML;
  if (!html) return;
  const rows = Array.from(document.querySelectorAll('#tableAdminContainer table tr'));
  const csv = rows.map(row => Array.from(row.children).map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], {type:'text/csv'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'recap-admin.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
