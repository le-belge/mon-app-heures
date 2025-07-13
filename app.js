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

function listeMoisDispo() {
  const now = new Date();
  const months = [];
  for(let m = 1; m <= 12; m++) {
    let mm = m.toString().padStart(2, '0');
    months.push(`${mm}/${now.getFullYear()}`);
  }
  return months;
}

let currentUser = null;
let currentOuvrier = null;
let semainesGlobales = getAllSemaines();
let semaineCouranteIndex = 0;
let modeAdmin = false;
let docsBySemaine = {};
let docsByMois = {};

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
    await chargerDonneesAdmin();
    afficherRecapAdmin();
  } else {
    document.getElementById('recap-admin').style.display = "none";
    document.getElementById('recap-ouvrier').style.display = "block";
    await chargerDonneesOuvrier(currentOuvrier.nom);
    afficherRecapOuvrier(currentOuvrier.nom);
  }
}

// Chargement des données
async function chargerDonneesOuvrier(nom) {
  const heuresSnap = await db.collection("heures").where("ouvrier", "==", nom).get();
  docsBySemaine = {};
  docsByMois = {};
  heuresSnap.forEach(doc => {
    const d = doc.data();
    if (d.semaine) docsBySemaine[d.semaine] = { ...d, id: doc.id };
    if (d.timestamp) {
      const date = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp.seconds*1000);
      const mois = ("0"+(date.getMonth()+1)).slice(-2) + "/" + date.getFullYear();
      if (!docsByMois[mois]) docsByMois[mois] = [];
      docsByMois[mois].push(d);
    }
  });
}

async function chargerDonneesAdmin() {
  const heuresSnap = await db.collection("heures").get();
  docsBySemaine = {};
  docsByMois = {};
  heuresSnap.forEach(doc => {
    const d = doc.data();
    if (d.semaine) {
      if (!docsBySemaine[d.semaine]) docsBySemaine[d.semaine] = [];
      docsBySemaine[d.semaine].push({ ...d, id: doc.id });
    }
    if (d.timestamp) {
      const date = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp.seconds*1000);
      const mois = ("0"+(date.getMonth()+1)).slice(-2) + "/" + date.getFullYear();
      if (!docsByMois[mois]) docsByMois[mois] = [];
      docsByMois[mois].push(d);
    }
  });
}

// -------------------
// AFFICHAGE OUVRIER
// -------------------

function renderSemaineSelect() {
  const recapHeader = document.querySelector('.recap-header');
  recapHeader.innerHTML = `
    <label for="selectTypePeriode">Période :</label>
    <select id="selectTypePeriode">
      <option value="semaine" selected>Semaine</option>
      <option value="mois">Mois</option>
    </select>
    <select id="selectSemaine"></select>
    <select id="selectMois" style="display:none;"></select>
    <button id="btnExport">Exporter</button>
    <button id="btnPrint">Imprimer</button>
    <button id="btnSave" class="btn-save">Sauvegarder</button>
    <span id="saveNotif"></span>
  `;

  const selectType = document.getElementById('selectTypePeriode');
  const selectSemaine = document.getElementById('selectSemaine');
  const selectMois = document.getElementById('selectMois');

  // Remplissage initial semaines
  semainesGlobales.forEach((s,i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = s;
    selectSemaine.appendChild(option);
  });
  selectSemaine.value = semaineCouranteIndex;

  // Remplissage mois dispo
  const moisList = Object.keys(docsByMois).sort();
  moisList.forEach(mois => {
    const option = document.createElement('option');
    option.value = mois;
    option.textContent = mois;
    selectMois.appendChild(option);
  });
  if (moisList.length > 0) selectMois.value = moisList[0];

  function switchPeriode() {
    if (selectType.value === "semaine") {
      selectSemaine.style.display = "";
      selectMois.style.display = "none";
      updateRecapOuvrier(currentOuvrier.nom);
    } else {
      selectSemaine.style.display = "none";
      selectMois.style.display = "";
      updateRecapOuvrierMois(currentOuvrier.nom);
    }
  }

  selectType.onchange = switchPeriode;
  selectSemaine.onchange = function() {
    semaineCouranteIndex = parseInt(this.value,10);
    updateRecapOuvrier(currentOuvrier.nom);
  };
  selectMois.onchange = function() {
    updateRecapOuvrierMois(currentOuvrier.nom);
  };

  document.getElementById('btnExport').onclick = () => {
    if (selectType.value === "semaine") exportRecapOuvrier(currentOuvrier.nom);
    else exportRecapOuvrierMois(currentOuvrier.nom);
  };
  document.getElementById('btnPrint').onclick = () => window.print();
  document.getElementById('btnSave').onclick = () => {
    if (selectType.value === "semaine") sauvegarderSemaine(currentOuvrier.nom);
    else sauvegarderMois(currentOuvrier.nom);
  };

  switchPeriode();
}

function updateRecapOuvrier(nomOuvrier) {
  const semaine = semainesGlobales[semaineCouranteIndex];
  const joursSem = joursSemaineAvecDates(semaine);
  let row = docsBySemaine[semaine] || {};

  let html = `<table>
    <tr>
      <th>Semaine</th>
      ${joursSem.map(j=>`<th>${j.label}<br><span style="font-size:0.87em;color:#555">${j.date}</span></th>`).join("")}
      <th>Total</th><th>Mal</th><th>Cng</th><th>F</th>
    </tr>
    <tr>
      <td>${semaine}</td>`;

  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;
  joursSem.forEach(j => {
    let val = row[j.key] || "";
    let isHeure = !val || /^\d{1,2}:\d{2}$/.test(val);
    html += `<td>
      <select class="select-jour" id="select_${j.key}" style="display:none;">
        <option value=""></option>
        <option value="Maladie" ${val==="Maladie"?"selected":""}>Maladie</option>
        <option value="Congé" ${val==="Congé"?"selected":""}>Congé</option>
        <option value="Formation" ${val==="Formation"?"selected":""}>Formation</option>
      </select>
      <input type="text" class="input-jour" id="input_${j.key}" value="${isHeure ? val : ""}" style="width:70px;text-align:center;">
      <button class="btnStatut" id="btn_${j.key}">▼</button>
    </td>`;

    if(val === "Maladie") maladie++;
    else if(val === "Congé") conge++;
    else if(val === "Formation") formation++;
    else if(isHeure && /^\d{1,2}:\d{2}$/.test(val)) {
      const [h,m] = val.split(":").map(Number);
      totalHeures += h + m/60;
    }
  });

  html += `<td id="totalHeuresCell">${formatHeures(totalHeures)}</td>
    <td id="totalMaladie">${maladie}</td><td id="totalConge">${conge}</td><td id="totalFormation">${formation}</td>
  </tr></table>`;

  document.getElementById('tableRecapContainer').innerHTML = html;

  joursSem.forEach(j => {
    const select = document.getElementById("select_"+j.key);
    const input = document.getElementById("input_"+j.key);
    const btn = document.getElementById("btn_"+j.key);

    btn.onclick = function(e) {
      e.preventDefault();
      if(select.style.display === "none") {
        select.style.display = "";
        input.style.display = "none";
        btn.textContent = "⌨";
        select.value = "";
      } else {
        select.style.display = "none";
        input.style.display = "";
        btn.textContent = "▼";
        input.value = "";
      }
      majTotauxLigne();
    };
    select.onchange = function() {
      if(!select.value) {
        select.style.display = "none";
        input.style.display = "";
        btn.textContent = "▼";
      }
      majTotauxLigne();
    };
    input.oninput = majTotauxLigne;
  });

  majTotauxLigne();
}

function majTotauxLigne() {
  const semaine = semainesGlobales[semaineCouranteIndex];
  const joursSem = joursSemaineAvecDates(semaine);
  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;

  joursSem.forEach(j => {
    let val = "";
    const select = document.getElementById("select_"+j.key);
    const input = document.getElementById("input_"+j.key);
    if(select.value !== "Maladie" && select.value !== "Congé" && select.value !== "Formation" && select.style.display === "none") {
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
  document.getElementById('totalHeuresCell').innerText = formatHeures(totalHeures);
  document.getElementById('totalMaladie').innerText = maladie;
  document.getElementById('totalConge').innerText = conge;
  document.getElementById('totalFormation').innerText = formation;
}

async function sauvegarderSemaine(nomOuvrier) {
  const semaine = semainesGlobales[semaineCouranteIndex];
  const joursSem = joursSemaineAvecDates(semaine);
  let data = { ouvrier: nomOuvrier, semaine: semaine, timestamp: new Date() };
  joursSem.forEach(j => {
    const select = document.getElementById("select_"+j.key);
    const input = document.getElementById("input_"+j.key);
    let val = "";
    if(select.style.display === "none") val = input.value.trim();
    else val = select.value;
    data[j.key] = val;
  });
  const heuresSnap = await db.collection("heures")
    .where("ouvrier", "==", nomOuvrier)
    .where("semaine", "==", semaine)
    .get();
  try {
    if(!heuresSnap.empty) {
      await db.collection("heures").doc(heuresSnap.docs[0].id).set(data, {merge:true});
    } else {
      await db.collection("heures").add(data);
    }
    document.getElementById('saveNotif').style.display = "";
    document.getElementById('saveNotif').innerText = "Enregistré ✔";
    setTimeout(()=>{afficherRecapOuvrier(nomOuvrier); document.getElementById('saveNotif').style.display="none"; }, 1200);
  } catch(e) {
    document.getElementById('saveNotif').style.display = "";
    document.getElementById('saveNotif').style.color = "#d22";
    document.getElementById('saveNotif').innerText = "Erreur lors de l'enregistrement";
    setTimeout(()=>{document.getElementById('saveNotif').style.display="none";}, 3500);
  }
}

// -----------------
// Récap mois ouvrier
// -----------------

function updateRecapOuvrierMois(nomOuvrier) {
  const selectMois = document.getElementById('selectMois');
  const mois = selectMois.value;
  const joursMois = getJoursDuMois(mois);
  const rows = docsByMois[mois] || [];

  let html = `<table>
    <tr>
      <th>Jour</th>
      ${joursMois.map(j => `<th>${j.date}</th>`).join("")}
      <th>Total</th><th>Mal</th><th>Cng</th><th>F</th>
    </tr>`;

  html += `<tr><td>${mois}</td>`;
  let totalHeures = 0, maladie = 0, conge = 0, formation = 0;

  joursMois.forEach(jour => {
    let val = "";
    // Cherche la donnée dans rows (collection du mois)
    for(let r of rows) {
      const d = r[jour.key];
      if(d) { val = d; break; }
    }
    html += `<td>${val}</td>`;
    if(val === "Maladie") maladie++;
    else if(val === "Congé") conge++;
    else if(val === "Formation") formation++;
    else if(/^\d{1,2}:\d{2}$/.test(val)) {
      const [h,m] = val.split(":").map(Number);
      totalHeures += h + m/60;
    }
  });
  html += `<td>${formatHeures(totalHeures)}</td><td>${maladie}</td><td>${conge}</td><td>${formation}</td></tr></table>`;

  document.getElementById('tableRecapContainer').innerHTML = html;
}

function getJoursDuMois(moisStr) {
  // Format moisStr = "07/2025"
  const [mm, yyyy] = moisStr.split("/");
  const date = new Date(parseInt(yyyy), parseInt(mm)-1, 1);
  const jours = [];
  while(date.getMonth() === parseInt(mm)-1) {
    jours.push({
      key: jourKeyFromDate(date),
      date: ("0"+date.getDate()).slice(-2)
    });
    date.setDate(date.getDate()+1);
  }
  return jours;
}

function jourKeyFromDate(date) {
  // Retourne la clé "lundi", "mardi" ... selon le jour de la semaine
  const map = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  return map[date.getDay()];
}

// --------------
// ADMIN
// --------------

async function afficherRecapAdmin() {
  const ouvSnap = await db.collection("ouvriers").get();
  let ouvriers = ouvSnap.docs.map(doc => doc.data().nom);
  ouvriers = ouvriers.filter(o => o).sort((a,b) => a.localeCompare(b));

  const recapHeader = document.querySelector('.recap-header-admin');
  recapHeader.innerHTML = `
    <label for="selectTypePeriodeAdmin">Période :</label>
    <select id="selectTypePeriodeAdmin">
      <option value="semaine" selected>Semaine</option>
      <option value="mois">Mois</option>
    </select>
    <select id="selectSemaineAdmin"></select>
    <select id="selectMoisAdmin" style="display:none;"></select>
    <button id="btnExportAdmin">Exporter</button>
    <button id="btnPrintAdmin">Imprimer</button>
    <button id="btnSaveAdmin" class="btn-save">Sauvegarder tout</button>
  `;

  const selectType = document.getElementById('selectTypePeriodeAdmin');
  const selectSemaine = document.getElementById('selectSemaineAdmin');
  const selectMois = document.getElementById('selectMoisAdmin');

  semainesGlobales.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    selectSemaine.appendChild(opt);
  });

  const moisList = Object.keys(docsByMois).sort();
  moisList.forEach(mois => {
    const opt = document.createElement('option');
    opt.value = mois;
    opt.textContent = mois;
    selectMois.appendChild(opt);
  });

  function switchPeriodeAdmin() {
    if(selectType.value === "semaine") {
      selectSemaine.style.display = "";
      selectMois.style.display = "none";
      updateRecapAdminSemaine(ouvriers);
    } else {
      selectSemaine.style.display = "none";
      selectMois.style.display = "";
      updateRecapAdminMois(ouvriers);
    }
  }

  selectType.onchange = switchPeriodeAdmin;
  selectSemaine.onchange = () => updateRecapAdminSemaine(ouvriers);
  selectMois.onchange = () => updateRecapAdminMois(ouvriers);

  document.getElementById('btnExportAdmin').onclick = () => {
    if(selectType.value === "semaine") exportRecapAdminSemaine();
    else exportRecapAdminMois();
  };
  document.getElementById('btnPrintAdmin').onclick = () => window.print();
  document.getElementById('btnSaveAdmin').onclick = () => {
    if(selectType.value === "semaine") sauvegarderSemaineAdmin(ouvriers);
    else sauvegarderMoisAdmin(ouvriers);
  };

  switchPeriodeAdmin();
}

function updateRecapAdminSemaine(ouvriers) {
  const semaine = document.getElementById('selectSemaineAdmin').value;
  const joursSem = joursSemaineAvecDates(semaine);
  const rows = docsBySemaine[semaine] || [];

  let html = `<table>
    <tr>
      <th>Ouvrier</th>
      ${joursSem.map(j => `<th>${j.label}<br><span style="font-size:0.87em;color:#555">${j.date}</span></th>`).join("")}
      <th>Total</th><th>Mal</th><th>Cng</th><th>F</th>
    </tr>`;

  ouvriers.forEach(nom => {
    let row = rows.find(r => r.ouvrier === nom) || {};
    html += `<tr data-ouvrier="${nom}"><td>${nom}</td>`;

    let totalHeures = 0, maladie = 0, conge = 0, formation = 0;

    joursSem.forEach(j => {
      let val = row[j.key] || "";
      let isHeure = !val || /^\d{1,2}:\d{2}$/.test(val);
      html += `<td>
        <select class="select-jour-admin" data-jour="${j.key}" data-ouvrier="${nom}" style="display:none;">
          <option value=""></option>
          <option value="Maladie" ${val === "Maladie" ? "selected" : ""}>Maladie</option>
          <option value="Congé" ${val === "Congé" ? "selected" : ""}>Congé</option>
          <option value="Formation" ${val === "Formation" ? "selected" : ""}>Formation</option>
        </select>
        <input type="text" class="input-jour-admin" data-jour="${j.key}" data-ouvrier="${nom}" value="${isHeure ? val : ""}" style="width:70px;text-align:center;">
        <button class="btnStatut" data-jour="${j.key}" data-ouvrier="${nom}">▼</button>
      </td>`;

      if(val === "Maladie") maladie++;
      else if(val === "Congé") conge++;
      else if(val === "Formation") formation++;
      else if(isHeure && /^\d{1,2}:\d{2}$/.test(val)) {
        const [h,m] = val.split(":").map(Number);
        totalHeures += h + m / 60;
      }
    });

    html += `<td class="total-heures">${formatHeures(totalHeures)}</td>
      <td class="total-maladie">${maladie}</td>
      <td class="total-conge">${conge}</td>
      <td class="total-formation">${formation}</td>
    </tr>`;
  });

  html += `</table>`;
  document.getElementById('tableAdminContainer').innerHTML = html;

  // Event handlers admin edition
  document.querySelectorAll('.btnStatut').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      const ouvrier = btn.getAttribute('data-ouvrier');
      const jour = btn.getAttribute('data-jour');
      const select = document.querySelector(`.select-jour-admin[data-ouvrier="${ouvrier}"][data-jour="${jour}"]`);
      const input = document.querySelector(`.input-jour-admin[data-ouvrier="${ouvrier}"][data-jour="${jour}"]`);

      if (select.style.display === "none") {
        select.style.display = "";
        input.style.display = "none";
        btn.textContent = "⌨";
        select.value = "";
      } else {
        select.style.display = "none";
        input.style.display = "";
        btn.textContent = "▼";
        input.value = "";
      }
      updateTotalsAdmin(ouvrier);
    };
  });

  document.querySelectorAll('.select-jour-admin').forEach(select => {
    select.onchange = function() {
      if (!this.value) {
        this.style.display = "none";
        const ouvrier = this.getAttribute('data-ouvrier');
        const jour = this.getAttribute('data-jour');
        const btn = document.querySelector(`.btnStatut[data-ouvrier="${ouvrier}"][data-jour="${jour}"]`);
        const input = document.querySelector(`.input-jour-admin[data-ouvrier="${ouvrier}"][data-jour="${jour}"]`);
        input.style.display = "";
        btn.textContent = "▼";
      }
      updateTotalsAdmin(this.getAttribute('data-ouvrier'));
    };
  });

  document.querySelectorAll('.input-jour-admin').forEach(input => {
    input.oninput = function() {
      updateTotalsAdmin(this.getAttribute('data-ouvrier'));
    };
  });

  updateTotalsAdmin();
}

function updateTotalsAdmin(ouvrier = null) {
  let rows;
  if(ouvrier) {
    rows = [document.querySelector(`tr[data-ouvrier="${ouvrier}"]`)];
  } else {
    rows = Array.from(document.querySelectorAll('#tableAdminContainer table tr[data-ouvrier]'));
  }
  rows.forEach(row => {
    if(!row) return;
    const nom = row.getAttribute('data-ouvrier');
    const selectEls = Array.from(document.querySelectorAll(`.select-jour-admin[data-ouvrier="${nom}"]`));
    const inputEls = Array.from(document.querySelectorAll(`.input-jour-admin[data-ouvrier="${nom}"]`));

    let maladie = 0, conge = 0, formation = 0, totalHeures = 0;

    for(let i = 0; i < selectEls.length; i++) {
      const sel = selectEls[i];
      const inp = inputEls[i];
      let val = sel.style.display === "none" ? inp.value.trim() : sel.value;

      if(val === "Maladie") maladie++;
      else if(val === "Congé") conge++;
      else if(val === "Formation") formation++;
      else if(/^\d{1,2}:\d{2}$/.test(val)) {
        const [h,m] = val.split(":").map(Number);
        totalHeures += h + m / 60;
      }
    }
    row.querySelector('.total-heures').textContent = formatHeures(totalHeures);
    row.querySelector('.total-maladie').textContent = maladie;
    row.querySelector('.total-conge').textContent = conge;
    row.querySelector('.total-formation').textContent = formation;
  });
}

async function sauvegarderSemaineAdmin(ouvriers) {
  const semaine = document.getElementById('selectSemaineAdmin').value;

  for(const nom of ouvriers) {
    let row = document.querySelector(`tr[data-ouvrier="${nom}"]`);
    if(!row) continue;

    const data = { ouvrier: nom, semaine, timestamp: new Date() };

    const selectEls = Array.from(document.querySelectorAll(`.select-jour-admin[data-ouvrier="${nom}"]`));
    const inputEls = Array.from(document.querySelectorAll(`.input-jour-admin[data-ouvrier="${nom}"]`));

    for(let i = 0; i < selectEls.length; i++) {
      const sel = selectEls[i];
      const inp = inputEls[i];
      const key = sel.getAttribute('data-jour');
      data[key] = sel.style.display === "none" ? inp.value.trim() : sel.value;
    }

    const heuresSnap = await db.collection("heures")
      .where("ouvrier", "==", nom)
      .where("semaine", "==", semaine)
      .get();

    try {
      if(!heuresSnap.empty) {
        await db.collection("heures").doc(heuresSnap.docs[0].id).set(data, {merge:true});
      } else {
        await db.collection("heures").add(data);
      }
    } catch(e) {
      console.error(`Erreur sauvegarde semaine pour ${nom}`, e);
    }
  }

  alert("Toutes les données ont été sauvegardées.");
  await chargerDonneesAdmin();
  afficherRecapAdmin();
}

// -------------------
// Récap mois admin
// -------------------

function updateRecapAdminMois(ouvriers) {
  const selectMois = document.getElementById('selectMoisAdmin');
  const mois = selectMois.value;
  const joursMois = getJoursDuMois(mois);
  const rows = docsByMois[mois] || [];

  let html = `<table>
    <tr>
      <th>Ouvrier</th>
      ${joursMois.map(j => `<th>${j.date}</th>`).join("")}
      <th>Total</th><th>Mal</th><th>Cng</th><th>F</th>
    </tr>`;

  ouvriers.forEach(nom => {
    let row = rows.find(r => r.ouvrier === nom) || {};
    html += `<tr data-ouvrier="${nom}"><td>${nom}</td>`;

    let totalHeures = 0, maladie = 0, conge = 0, formation = 0;

    joursMois.forEach(j => {
      let val = row[j.key] || "";
      let isHeure = !val || /^\d{1,2}:\d{2}$/.test(val);

      html += `<td>
        <select class="select-jour-admin" data-jour="${j.key}" data-ouvrier="${nom}" style="display:none;">
          <option value=""></option>
          <option value="Maladie" ${val === "Maladie" ? "selected" : ""}>Maladie</option>
          <option value="Congé" ${val === "Congé" ? "selected" : ""}>Congé</option>
          <option value="Formation" ${val === "Formation" ? "selected" : ""}>Formation</option>
        </select>
        <input type="text" class="input-jour-admin" data-jour="${j.key}" data-ouvrier="${nom}" value="${isHeure ? val : ""}" style="width:70px;text-align:center;">
        <button class="btnStatut" data-jour="${j.key}" data-ouvrier="${nom}">▼</button>
      </td>`;

      if(val === "Maladie") maladie++;
      else if(val === "Congé") conge++;
      else if(val === "Formation") formation++;
      else if(isHeure && /^\d{1,2}:\d{2}$/.test(val)) {
        const [h,m] = val.split(":").map(Number);
        totalHeures += h + m / 60;
      }
    });

    html += `<td class="total-heures">${formatHeures(totalHeures)}</td>
      <td class="total-maladie">${maladie}</td>
      <td class="total-conge">${conge}</td>
      <td class="total-formation">${formation}</td>
    </tr>`;
  });

  html += `</table>`;
  document.getElementById('tableAdminContainer').innerHTML = html;

  // Ré-attacher événements édition
  document.querySelectorAll('.btnStatut').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      const ouvrier = btn.getAttribute('data-ouvrier');
      const jour = btn.getAttribute('data-jour');
      const select = document.querySelector(`.select-jour-admin[data-ouvrier="${ouvrier}"][data-jour="${jour}"]`);
      const input = document.querySelector(`.input-jour-admin[data-ouvrier="${ouvrier}"][data-jour="${jour}"]`);

      if(select.style.display === "none") {
        select.style.display = "";
        input.style.display = "none";
        btn.textContent = "⌨";
        select.value = "";
      } else {
        select.style.display = "none";
        input.style.display = "";
        btn.textContent = "▼";
        input.value = "";
      }
      updateTotalsAdmin(ouvrier);
    };
  });

  document.querySelectorAll('.select-jour-admin').forEach(select => {
    select.onchange = function() {
      if (!this.value) {
        this.style.display = "none";
        const ouvrier = this.getAttribute('data-ouvrier');
        const jour = this.getAttribute('data-jour');
        const btn = document.querySelector(`.btnStatut[data-ouvrier="${ouvrier}"][data-jour="${jour}"]`);
        const input = document.querySelector(`.input-jour-admin[data-ouvrier="${ouvrier}"][data-jour="${jour}"]`);
        input.style.display = "";
        btn.textContent = "▼";
      }
      updateTotalsAdmin(this.getAttribute('data-ouvrier'));
    };
  });

  document.querySelectorAll('.input-jour-admin').forEach(input => {
    input.oninput = function() {
      updateTotalsAdmin(this.getAttribute('data-ouvrier'));
    };
  });

  updateTotalsAdmin();
}

async function sauvegarderMoisAdmin(ouvriers) {
  const mois = document.getElementById('selectMoisAdmin').value;
  const joursMois = getJoursDuMois(mois);

  for(const nom of ouvriers) {
    let data = { ouvrier: nom, timestamp: new Date() };

    const selectEls = Array.from(document.querySelectorAll(`.select-jour-admin[data-ouvrier="${nom}"]`));
    const inputEls = Array.from(document.querySelectorAll(`.input-jour-admin[data-ouvrier="${nom}"]`));

    for(let i = 0; i < selectEls.length; i++) {
      const sel = selectEls[i];
      const inp = inputEls[i];
      const key = sel.getAttribute('data-jour');
      data[key] = sel.style.display === "none" ? inp.value.trim() : sel.value;
    }

    // on sauvegarde ici sans semaine, mais on pourrait ajouter un champ mois ou gérer différemment
    try {
      await db.collection("heures").add(data);
    } catch(e) {
      console.error(`Erreur sauvegarde mois pour ${nom}`, e);
    }
  }

  alert("Toutes les données mensuelles ont été sauvegardées.");
  await chargerDonneesAdmin();
  afficherRecapAdmin();
}

// Fonctions communes
function getJoursDuMois(moisStr) {
  const [mm, yyyy] = moisStr.split("/");
  const date = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
  const jours = [];
  while(date.getMonth() === parseInt(mm) -1) {
    jours.push({
      key: jourKeyFromDate(date),
      date: ("0"+date.getDate()).slice(-2)
    });
    date.setDate(date.getDate()+1);
  }
  return jours;
}
function jourKeyFromDate(date) {
  const map = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  return map[date.getDay()];
}

// Exports CSV (simples)
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
function exportRecapOuvrierMois(nomOuvrier) {
  exportRecapOuvrier(nomOuvrier);
}
function exportRecapAdminSemaine() {
  const html = document.getElementById('tableAdminContainer').innerHTML;
  if (!html) return;
  const rows = Array.from(document.querySelectorAll('#tableAdminContainer table tr'));
  const csv = rows.map(row => Array.from(row.children).map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], {type:'text/csv'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'recap-admin-semaine.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function exportRecapAdminMois() {
  exportRecapAdminSemaine();
}
