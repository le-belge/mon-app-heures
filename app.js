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

// --- LOGIN LOGIQUE ---
let currentUser = null;
let currentOuvrier = null;
let semainesGlobales = getAllSemaines();
let semaineCouranteIndex = 0;
let docsBySemaine = {};

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

// --- RÉCAP OUVRIER avec navigation semaines et select ---
async function afficherRecapOuvrier(nomOuvrier) {
  document.getElementById('recap-ouvrier').style.display = 'block';

  // Récupérer tous les docs pour l'ouvrier
  const heuresSnap = await db.collection("heures")
    .where("ouvrier", "==", nomOuvrier)
    .get();
  docsBySemaine = {};
  heuresSnap.forEach(doc => {
    const d = doc.data();
    if (d.semaine) docsBySemaine[d.semaine] = { ...d, id: doc.id };
  });

  // Chercher la semaine en cours ou S23 si on n'est pas dans la plage
  let semaineEnCours = getSemaineEnCours();
  let indexEnCours = semainesGlobales.indexOf(semaineEnCours);
  if (indexEnCours === -1) indexEnCours = 0;
  semaineCouranteIndex = indexEnCours;

  renderSemaineNavigator();
  updateRecapOuvrier(currentOuvrier.nom);
}

function renderSemaineNavigator() {
  // En-tête avec boutons < Sxx >
  const recapHeader = document.querySelector('.recap-header');
  recapHeader.innerHTML = `
    <button id="btnPrevSemaine">&lt;</button>
    <span id="semaineLabel" style="margin: 0 18px; font-weight:bold;">${semainesGlobales[semaineCouranteIndex]}</span>
    <button id="btnNextSemaine">&gt;</button>
    <button id="btnExport" style="margin-left:28px;">Exporter</button>
    <button id="btnPrint">Imprimer</button>
    <button id="btnSave" style="margin-left:28px;" class="btn-save">Sauvegarder</button>
    <span id="saveNotif"></span>
  `;
  document.getElementById('btnPrevSemaine').onclick = () => {
    if (semaineCouranteIndex > 0) {
      semaineCouranteIndex--;
      renderSemaineNavigator();
      updateRecapOuvrier(currentOuvrier.nom);
    }
  };
  document.getElementById('btnNextSemaine').onclick = () => {
    if (semaineCouranteIndex < semainesGlobales.length - 1) {
      semaineCouranteIndex++;
      renderSemaineNavigator();
      updateRecapOuvrier(currentOuvrier.nom);
    }
  };
  document.getElementById('btnExport').onclick = () => exportRecapOuvrier(currentOuvrier.nom);
  document.getElementById('btnPrint').onclick = () => window.print();
  document.getElementById('btnSave').onclick = () => sauvegarderSemaine(currentOuvrier.nom);
}

function updateRecapOuvrier(nomOuvrier) {
  const semaine = semainesGlobales[semaineCouranteIndex];
  const row = docsBySemaine[semaine];
  let jours = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;
  let joursHtml = "";

  jours.forEach(jour => {
    let val = row && row[jour] ? row[jour] : "";
    let isHeure = val && !["Maladie","Congé","Formation"].includes(val);
    joursHtml += `<td>
      <select class="select-jour" id="select_${jour}" style="width:105px;">
        <option value=""></option>
        <option value="Maladie" ${val==="Maladie"?"selected":""}>Maladie</option>
        <option value="Congé" ${val==="Congé"?"selected":""}>Congé</option>
        <option value="Formation" ${val==="Formation"?"selected":""}>Formation</option>
        <option value="__autre__" ${isHeure ? "selected":""}>Heure personnalisée</option>
      </select>
      <input type="text" class="input-jour" id="input_${jour}" value="${isHeure ? val : ""}" style="width:60px;text-align:center;${isHeure ? '' : 'display:none;'}">
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
    </tr>`;

  html += `<tr>
    <td>${semaine}</td>
    ${joursHtml}
    <td id="totalHeuresCell"><b>${formatHeures(totalHeures)}</b></td>
    <td id="totalMaladie">${maladie}</td>
    <td id="totalConge">${conge}</td>
    <td id="totalFormation">${formation}</td>
  </tr>`;

  html += `</table>`;
  document.getElementById('tableRecapContainer').innerHTML = html;

  // Gestion dynamique select/input + totaux en live
  jours.forEach(jour => {
    const select = document.getElementById("select_"+jour);
    const input = document.getElementById("input_"+jour);

    if (select) {
      select.addEventListener("change", function() {
        if (this.value === "__autre__") {
          input.style.display = "";
          input.value = "";
          input.focus();
        } else if (this.value === "") {
          input.style.display = "none";
          input.value = "";
        } else {
          input.style.display = "none";
          input.value = this.value;
        }
        majTotauxLigne();
      });
    }
    if (input) {
      input.addEventListener("input", majTotauxLigne);
    }
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
    if (select.value === "__autre__") {
      val = input.value.trim();
    } else {
      val = select.value;
    }
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

// --- Sauvegarde Firestore ---
async function sauvegarderSemaine(nomOuvrier) {
  const semaine = semainesGlobales[semaineCouranteIndex];
  let data = {
    ouvrier: nomOuvrier,
    semaine: semaine,
    timestamp: new Date()
  };
  let jours = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
  jours.forEach(jour => {
    let val = "";
    const select = document.getElementById("select_"+jour);
    const input = document.getElementById("input_"+jour);
    if (select.value === "__autre__") {
      val = input.value.trim();
    } else {
      val = select.value;
    }
    data[jour] = val;
  });
  let docId = docsBySemaine[semaine] ? docsBySemaine[semaine].id : undefined;
  try {
    if(docId) {
      await db.collection("heures").doc(docId).set(data, {merge:true});
    } else {
      const newDoc = await db.collection("heures").add(data);
      docsBySemaine[semaine] = { ...data, id: newDoc.id };
    }
    document.getElementById('saveNotif').style.display = "";
    document.getElementById('saveNotif').innerText = "Enregistré ✔";
    setTimeout(()=>{
      document.getElementById('saveNotif').style.display="none";
      afficherRecapOuvrier(nomOuvrier);
    }, 1200);
  } catch(e) {
    document.getElementById('saveNotif').style.display = "";
    document.getElementById('saveNotif').style.color = "#d22";
    document.getElementById('saveNotif').innerText = "Erreur lors de l'enregistrement";
    setTimeout(()=>{document.getElementById('saveNotif').style.display="none";}, 3500);
  }
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
