// ========= INIT FIREBASE =========
const firebaseConfig = {
  apiKey: "AIzaSyCPHCe7nziAYCyC-aArO1HiGDWqWJdIxAY",
  authDomain: "pointage-heures.firebaseapp.com",
  projectId: "pointage-heures",
  storageBucket: "pointage-heures.appspot.com",
  messagingSenderId: "219482491250",
  appId: "1:219482491250:web:NWEyMThmMDEtMDZiYS00NWQxLTlkMmEtYjg2ODMwMzI3Yjhi"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ========= VARIABLES GLOBALES =========
const days = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
let ouvriers = {};
let currentUser = "";
let currentWeek = "S" + getWeekNumber(new Date());
let localData = {};
let datesSemaine = [];
let currentMonth = new Date().getMonth() + 1;
const year = new Date().getFullYear();

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

// ========= CHARGEMENT DES OUVRIERS =========
function loadOuvriers() {
  db.collection("ouvriers").get().then(snap=>{
    ouvriers = {};
    snap.forEach(doc => ouvriers[doc.id] = doc.data().nom);
  });
}
loadOuvriers();

// ========= LOGIN =========
function checkLogin() {
  const code = document.getElementById("password").value.trim();
  db.collection("ouvriers").doc(code).get().then(doc=>{
    if(doc.exists) {
      currentUser = doc.data().nom;
      document.getElementById("login").style.display = "none";
      document.getElementById("app").style.display = "block";
      document.getElementById("welcome").textContent = "Bienvenue " + currentUser;
      if(code === "admin08110") {
        document.getElementById("adminManageOuvriers").style.display = "block";
        loadOuvrierList();
      }
      initWeekSelector();
      loadWeek();
      loadMonthlyRecap();
      loadYearlyRecap();
    } else {
      document.getElementById("loginError").textContent = "Code inconnu.";
    }
  });
}
document.getElementById("password").addEventListener("keydown",e=>{
  if(e.key==="Enter") checkLogin();
});

function logout() { location.reload(); }

// ========= GESTION DES OUVRIERS =========
function addOuvrier() {
  const code = document.getElementById("ouvrierCode").value.trim();
  const nom = document.getElementById("ouvrierNom").value.trim();
  if(!code || !nom) return;
  db.collection("ouvriers").doc(code).set({nom}).then(()=>{
    loadOuvriers();
    loadOuvrierList();
    document.getElementById("ouvrierCode").value = "";
    document.getElementById("ouvrierNom").value = "";
  });
}
function deleteOuvrier(code) {
  if(confirm("Supprimer cet ouvrier ?")) {
    db.collection("ouvriers").doc(code).delete().then(()=>{
      loadOuvriers();
      loadOuvrierList();
    });
  }
}
function loadOuvrierList() {
  db.collection("ouvriers").get().then(snap=>{
    let html = "<table><tr><th>Code</th><th>Nom</th><th></th></tr>";
    snap.forEach(doc=>{
      html += `<tr><td>${doc.id}</td><td>${doc.data().nom}</td>
               <td><button onclick="deleteOuvrier('${doc.id}')">Supprimer</button></td></tr>`;
    });
    html += "</table>";
    document.getElementById("ouvrierList").innerHTML = html;
  });
}

// ========= TABLES & RECAP =========
function initWeekSelector() {
  const selector = document.getElementById("weekSelector");
  selector.innerHTML = "";
  for (let i = 1; i <= 52; i++) {
    const opt = document.createElement("option");
    opt.value = "S" + i;
    opt.text = "S" + i;
    if (opt.value === currentWeek) opt.selected = true;
    selector.appendChild(opt);
  }
}
function getDatesOfWeek(weekNumber) {
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  const dow = simple.getDay();
  let monday = new Date(simple);
  if (dow <= 4) monday.setDate(simple.getDate() - dow + 1);
  else monday.setDate(simple.getDate() + 8 - dow);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}
function loadWeek() {
  currentWeek = document.getElementById("weekSelector").value;
  const weekNum = parseInt(currentWeek.slice(1));
  const dts = getDatesOfWeek(weekNum);
  datesSemaine = dts.map(d=> ("0"+d.getDate()).slice(-2)+"/"+("0"+(d.getMonth()+1)).slice(-2));
  document.getElementById("tablesContainer").innerHTML = "";
  db.collection("heures").where("semaine","==",currentWeek).get()
    .then(snapshot=>{
      localData[currentWeek] = {};
      snapshot.forEach(doc=>{
        const d = doc.data();
        localData[currentWeek][d.ouvrier] = days.map(day=> d[day]||"").concat([d.commentaire||""]);
      });
      const users = (currentUser==="Admin")
        ? Object.values(ouvriers)
        : [currentUser];
      users.forEach(u=>{
        const jours = localData[currentWeek][u] || ["","","","","","","",""];
        document.getElementById("tablesContainer").insertAdjacentHTML("beforeend", buildTableHTML(u, jours));
      });
      renderSummary(currentUser==="Admin", currentUser);
      loadMonthlyRecap();
      loadYearlyRecap();
    }).catch(err=> console.error("Erreur loadWeek:",err));
}
function buildTableHTML(user, jours) {
  let html = `<div class="user-block"><h3>${user} - ${currentWeek}</h3><table><thead><tr><th>Jour</th><th>Date</th><th>Heures / État</th></tr></thead><tbody>`;
  days.forEach((day,i)=>{
    html += `<tr><td>${day.charAt(0).toUpperCase()+day.slice(1)}</td><td>${datesSemaine[i]}</td><td>
      <input type="text" value="${jours[i]}" data-user="${user}" data-day="${i}" placeholder="ex: 8 ou Congé"/>
      <select onchange="this.previousElementSibling.value=this.value;">
        <option value="">-</option>
        <option value="Congé">Congé</option>
        <option value="Maladie">Maladie</option>
        <option value="Férié">Férié</option>
        <option value="Formation">Formation</option>
      </select>
    </td></tr>`;
  });
  html += `</tbody></table><textarea class="comment-box" placeholder="Commentaire pour ${user}" data-user="${user}">${jours[7]}</textarea></div>`;
  return html;
}
function renderSummary(isAdmin, userName) {
  let html = isAdmin
    ? "<h3>Récapitulatif des totaux</h3><table><thead><tr><th>Ouvrier</th><th>Total</th><th>Delta</th></tr></thead><tbody>"
    : `<h3>Vos heures</h3><table><thead><tr><th>Total</th><th>Delta</th></tr></thead><tbody>`;
  const rows = isAdmin
    ? Object.values(ouvriers).map(u=>[u, localData[currentWeek][u]||[]])
    : [[userName, localData[currentWeek][userName]||[]]];
  rows.forEach(([u, jours])=>{
    let total=0;
    jours.forEach(h=>{
      if(h && h!="Congé" && h!="Maladie" && h!="Formation" && h!="Férié") {
        const [hh,mm]=h.split(":").map(Number);
        if(!isNaN(hh)) total+=hh+(isNaN(mm)?0:mm/60);
      }
    });
    const delta=(total-40).toFixed(2);
    if(isAdmin) html+=`<tr><td>${u}</td><td>${total.toFixed(2)}</td><td style="color:${delta>=0?'green':'orange'}">${delta>=0?'+':''}${delta}</td></tr>`;
    else html+=`<tr><td>${total.toFixed(2)}</td><td style="color:${delta>=0?'green':'orange'}">${delta>=0?'+':''}${delta}</td></tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById("summaryContainer").innerHTML = html;
}

// ========= SAUVEGARDE =========
function saveWeek() {
  const inputs = document.querySelectorAll("#tablesContainer input");
  const promises = [];
  inputs.forEach(input=>{
    const u = input.dataset.user; const d = parseInt(input.dataset.day);
    const field = days[d];
    const val = input.value;
    promises.push(
      db.collection("heures").where("semaine","==",currentWeek).where("ouvrier","==",u).get()
      .then(snap=>{
        if(snap.empty){ 
          const obj={semaine:currentWeek,ouvrier:u}; obj[field]=val; 
          return db.collection("heures").add(obj);
        } else {
          return Promise.all(snap.docs.map(doc=>doc.ref.set({[field]:val},{merge:true})));
        }
      })
    );
  });
  Promise.all(promises).then(()=>{
    alert("Enregistré");
    loadWeek();
  });
}

// ========= EXPORT =========
function exportCSV() {
  let csv="Semaine,Ouvrier,Lundi,Mardi,Mercredi,Jeudi,Vendredi,Samedi,Dimanche,Commentaire\n";
  db.collection("heures").get().then(snap=>{
    snap.forEach(doc=>{
      const d = doc.data();
      csv += `${d.semaine||""},${d.ouvrier||""},${d.lundi||""},${d.mardi||""},${d.mercredi||""},${d.jeudi||""},${d.vendredi||""},${d.samedi||""},${d.dimanche||""},${d.commentaire||""}\n`;
    });
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="Sauvegarde_BDD_Pointage.csv"; a.click();
  });
}
function printAll() { document.title=`Recap_${currentWeek}`; window.print(); }

// ========= MENSUEL & ANNUEL =========
function loadMonthlyRecap() {
  currentMonth = parseInt(document.getElementById("monthSelector").value,10);
  const monthlyData={};
  db.collection("heures").get().then(snap=>{
    snap.forEach(doc=>{
      const d=doc.data();
      const wnum=parseInt(d.semaine.slice(1));
      const monday = getDatesOfWeek(wnum)[0];
      const m = monday.getMonth()+1;
      if(m===currentMonth){
        if(currentUser!=="Admin" && d.ouvrier!==currentUser) return;
        if(!monthlyData[d.ouvrier]) monthlyData[d.ouvrier]={total:0,conges:0,maladies:0,feries:0};
        days.forEach(day=>{
          const v=d[day];
          if(v=="Congé") monthlyData[d.ouvrier].conges++;
          else if(v=="Maladie") monthlyData[d.ouvrier].maladies++;
          else if(v=="Férié") monthlyData[d.ouvrier].feries++;
          else if(v){const [hh,mm]=v.split(":").map(Number);monthlyData[d.ouvrier].total+=hh+(mm||0)/60;}
        });
      }
    });
    let mc=document.getElementById("monthlyContainer"); 
    mc.innerHTML="<h3>Récapitulatif mensuel</h3>";
    let html=`<table><thead><tr><th>Ouvrier</th><th>Total</th><th>Congés</th><th>Maladie</th><th>Férié</th></tr></thead><tbody>`;
    Object.entries(monthlyData).forEach(([u,o])=>{
      html+=`<tr><td>${u}</td><td>${o.total.toFixed(2)}</td><td>${o.conges}</td><td>${o.maladies}</td><td>${o.feries}</td></tr>`;
    });
    html+=`</tbody></table>`;
    mc.innerHTML=html;
  });
}
function loadYearlyRecap() {
  const yearlyData={};
  db.collection("heures").get().then(snap=>{
    snap.forEach(doc=>{
      const d=doc.data();
      if(currentUser!=="Admin" && d.ouvrier!==currentUser) return;
      if(!yearlyData[d.ouvrier]) yearlyData[d.ouvrier]={total:0,conges:0,maladies:0,feries:0};
      days.forEach(day=>{
        const v=d[day];
        if(v=="Congé") yearlyData[d.ouvrier].conges++;
        else if(v=="Maladie") yearlyData[d.ouvrier].maladies++;
        else if(v=="Férié") yearlyData[d.ouvrier].feries++;
        else if(v){const [hh,mm]=v.split(":").map(Number);yearlyData[d.ouvrier].total+=hh+(mm||0)/60;}
      });
    });
    let yc=document.getElementById("yearlyContainer"); 
    yc.innerHTML="<h3>Récapitulatif annuel</h3>";
    let html=`<table><thead><tr><th>Ouvrier</th><th>Total</th><th>Congés</th><th>Maladie</th><th>Férié</th></tr></thead><tbody>`;
    Object.entries(yearlyData).forEach(([u,o])=>{
      html+=`<tr><td>${u}</td><td>${o.total.toFixed(2)}</td><td>${o.conges}</td><td>${o.maladies}</td><td>${o.feries}</td></tr>`;
    });
    html+=`</tbody></table>`;
    yc.innerHTML=html;
  });
}
