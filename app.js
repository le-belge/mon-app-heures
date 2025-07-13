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
  const row = docsBySemaine[semaine];
  let jours = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;
  let joursHtml = "";
  jours.forEach(jour => {
    let val = row && row[jour] ? row[jour] : "";
    let isHeure = val && !["Maladie","Congé","Formation"].includes(val);
    joursHtml += `<td>
      <select class="select-jour" id="select_${jour}">
        <option value=""></option>
        <option value="Maladie" ${val==="Maladie"?"selected":""}>Maladie</option>
        <option value="Congé" ${val==="Congé"?"selected":""}>Congé</option>
        <option value="Formation" ${val==="Formation"?"selected":""}>Formation</option>
        <option value="__autre__" ${isHeure ? "selected":""}>Heure personnalisée</option>
      </select>
      <input type="text" class="input-jour" id="input_${jour}" value="${isHeure ? val : ""}" style="width:54px;text-align:center;${isHeure ? '' : 'display:none;'}">
    </td>`;
    if(val === "Maladie") maladie++;
    else if(val === "Congé") conge++;
    else if(val === "Formation") formation++;
    else if(isHeure && /^\d{1,2}:\d{2}$/.test(val)) {
      const [h,m] = val.split(":").map(Number);
      totalHeures += h + m/60;
    }
  });
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
    </tr>
    <tr>
      <td>${semaine}</td>
      ${joursHtml}
      <td id="totalHeuresCell"><b>${formatHeures(totalHeures)}</b></td>
      <td id="totalMaladie">${maladie}</td>
      <td id="totalConge">${conge}</td>
      <td id="totalFormation">${formation}</td>
    </tr>
    </table>`;
  document.getElementById('tableRecapContainer').innerHTML = html;
  jours.forEach(jour => {
    const select = document.getElementById("select_"+jour);
    const input = document.getElementById("input_"+jour);
    if (select) {
      select.addEventListener("change", function() {
        if (this.value === "__autre__") {input.style.display = "";input.value = "";input.focus();}
        else if (this.value === "") {input.style.display = "none";input.value = "";}
        else {input.style.display = "none";input.value = this.value;}
        majTotauxLigne();
      });
    }
    if (input) {input.addEventListener("input", majTotauxLigne);}
  });
  majTotauxLigne();
}
function majTotauxLigne() {
  let jours = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;
  jours.forEach(jour => {
    let val = "";
    const select = document.getElementById("select_"+jour);
    const input = document.getElementById("input_"+jour);
    if (select.value === "__autre__") {val = input.value.trim();}
    else {val = select.value;}
    if(val === "Maladie") maladie++;
    else if(val === "Congé") conge++;
    else if(val === "Formation") formation++;
    else if(/^\d{1,2}:\d{2}$/.test(val)) {
      const [h,m] = val.split(":").map(Number);
      totalHeures += h + m/60;
    }
  });
  document.getElementById('totalHeuresCell').innerHTML = "<b>" + formatHeures(totalHeures) + "</b>";
  document.getElementById('totalMaladie').innerText = maladie;
  document.getElementById('totalConge').innerText = conge;
  document.getElementById('totalFormation').innerText = formation;
}
async function sauvegarderSemaine(nomOuvrier) {
  const semaine = semainesGlobales[semaineCouranteIndex];
  let data = { ouvrier: nomOuvrier, semaine: semaine, timestamp: new Date() };
  let jours = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
  jours.forEach(jour => {
    let val = "";
    const select = document.getElementById("select_"+jour);
    const input = document.getElementById("input_"+jour);
    if (select.value === "__autre__") { val = input.value.trim(); }
    else { val = select.value; }
    data[jour] = val;
  });
  const heuresSnap = await db.collection("heures")
    .where("ouvrier", "==", nomOuvrier)
    .where("semaine", "==", semaine)
    .get();
  try {
    if (!heuresSnap.empty) {
      await db.collection("heures").doc(heuresSnap.docs[0].id).set(data, {merge:true});
    } else {
      await db.collection("heures").add(data);
    }
    document.getElementById('saveNotif').style.display = "";
    document.getElementById('saveNotif').innerText = "Enregistré ✔";
    setTimeout(()=>{document.getElementById('saveNotif').style.display="none";afficherRecapOuvrier(nomOuvrier);}, 1200);
  } catch(e) {
    document.getElementById('saveNotif').style.display = "";
    document.getElementById('saveNotif').style.color = "#d22";
    document.getElementById('saveNotif').innerText = "Erreur lors de l'enregistrement";
    setTimeout(()=>{document.getElementById('saveNotif').style.display="none";}, 3500);
  }
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
    <label for="selectPeriode">Période :</label>
    <select id="selectPeriode">
      <option value="semaine">Semaine</option>
      <option value="mois">Mois</option>
    </select>
    <select id="selectSemaineAdmin"></select>
    <button id="btnExportAdmin">Exporter</button>
    <button id="btnPrintAdmin">Imprimer</button>
  `;

  // Remplissage dynamique des options semaine/mois
  const selectPeriode = document.getElementById('selectPeriode');
  const selectSemaineAdmin = document.getElementById('selectSemaineAdmin');
  async function updateSelectSemaine() {
    selectSemaineAdmin.innerHTML = "";
    if (selectPeriode.value === "semaine") {
      semainesGlobales.forEach((s,i)=>{
        selectSemaineAdmin.innerHTML += `<option value="${s}">${s}</option>`;
      });
      selectSemaineAdmin.style.display = "";
    } else {
      // liste des mois à partir des docs heures (prend tous les mois existants)
      const moisList = await listerMoisDispo();
      moisList.forEach(mois=>{
        selectSemaineAdmin.innerHTML += `<option value="${mois}">${mois}</option>`;
      });
      selectSemaineAdmin.style.display = "";
    }
    updateRecapAdmin(ouvriers); // refresh tableau quand select change
  }
  selectPeriode.onchange = updateSelectSemaine;
  await updateSelectSemaine();

  document.getElementById('btnExportAdmin').onclick = () => exportRecapAdmin();
  document.getElementById('btnPrintAdmin').onclick = () => window.print();
  selectSemaineAdmin.onchange = ()=> updateRecapAdmin(ouvriers);
}

async function listerMoisDispo() {
  // Parcourt toutes les heures, extrait les mois uniques existants
  const heuresSnap = await db.collection("heures").get();
  const moisSet = new Set();
  heuresSnap.forEach(doc=>{
    const d = doc.data();
    if (d.timestamp) {
      const date = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp.seconds*1000);
      const mois = ("0"+(date.getMonth()+1)).slice(-2) + "/" + date.getFullYear();
      moisSet.add(mois);
    }
  });
  return Array.from(moisSet).sort();
}

async function updateRecapAdmin(ouvriers) {
  const typePeriode = document.getElementById('selectPeriode').value;
  const periode = document.getElementById('selectSemaineAdmin').value;
  let heuresSnap;
  if (typePeriode === "semaine") {
    heuresSnap = await db.collection("heures").where("semaine","==",periode).get();
  } else {
    heuresSnap = await db.collection("heures").get();
  }

  let docsByOuvrier = {};
  heuresSnap.forEach(doc => {
    const d = doc.data();
    if (typePeriode === "mois" && d.timestamp) {
      const date = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp.seconds*1000);
      const moisDoc = ("0"+(date.getMonth()+1)).slice(-2) + "/" + date.getFullYear();
      if (moisDoc === periode) {
        if (!docsByOuvrier[d.ouvrier]) docsByOuvrier[d.ouvrier] = [];
        docsByOuvrier[d.ouvrier].push(d);
      }
    } else if (typePeriode === "semaine" && d.ouvrier) {
      docsByOuvrier[d.ouvrier] = [d];
    }
  });

  let jours = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
  let html = `<table>
    <tr>
      <th>Ouvrier</th>
      <th>Total heures</th>
      <th>Maladie</th>
      <th>Congé</th>
      <th>Formation</th>
    </tr>`;
  ouvriers.forEach(nomOuvrier => {
    let rows = docsByOuvrier[nomOuvrier] || [];
    let totalHeures = 0, maladie = 0, conge = 0, formation = 0;
    rows.forEach(row => {
      jours.forEach(jour=>{
        const val = row[jour];
        if(val === "Maladie") maladie++;
        else if(val === "Congé") conge++;
        else if(val === "Formation") formation++;
        else if(/^\d{1,2}:\d{2}$/.test(val)) {
          const [h,m] = val.split(":").map(Number);
          totalHeures += h + m/60;
        }
      });
    });
    html += `<tr>
      <td>${nomOuvrier}</td>
      <td><b>${formatHeures(totalHeures)}</b></td>
      <td>${maladie}</td>
      <td>${conge}</td>
      <td>${formation}</td>
    </tr>`;
  });
  html += `</table>`;
  document.getElementById('tableAdminContainer').innerHTML = html;
}

function exportRecapAdmin() {
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

