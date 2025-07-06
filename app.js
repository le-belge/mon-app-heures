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

const passwords = {
  "nm08110": "Mika",
  "ra08110": "Renaud",
  "ba08110": "Ben",
  "lm08110": "Marc",
  "do08110": "Oliv",
  "admin08110": "Admin"
};

let currentUser = "";
let currentWeek = "S23";
let localData = {};
let datesSemaine = [];
let currentMonth = new Date().getMonth() + 1;
const year = new Date().getFullYear();

console.log("JS chargé !");

function checkLogin() {
  const pass = document.getElementById("password").value.trim();
  if (passwords[pass]) {
    currentUser = passwords[pass];
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("welcome").textContent = "Bienvenue " + currentUser;
    document.getElementById("btnLogout").style.display = "inline-block";
    if (currentUser === "Admin") {
      document.getElementById("adminControls").style.display = "block";
    }
    initWeekSelector();
    loadWeek();
  } else {
    document.getElementById("loginError").textContent = "Mot de passe incorrect.";
  }
}

function logout() { location.reload(); }

function initWeekSelector() {
  const selector = document.getElementById("weekSelector");
  selector.innerHTML = "";
  for (let i = 23; i <= 52; i++) {
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
  for (let i = 0; i < 5; i++) {
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
  const tablesContainer = document.getElementById("tablesContainer");
  const summaryContainer = document.getElementById("summaryContainer");
  tablesContainer.innerHTML = "";
  summaryContainer.innerHTML = "";

  db.collection("heures").where("semaine","==",currentWeek).get()
    .then(snapshot=>{
      localData[currentWeek] = {};
      snapshot.forEach(doc=>{
        const d = doc.data();
        localData[currentWeek][d.ouvrier] = [
          d.lundi||"", d.mardi||"", d.mercredi||"", d.jeudi||"", d.vendredi||"", d.commentaire||""
        ];
      });
      const users = currentUser==="Admin"
        ? Object.values(passwords).filter(u=>u!="Admin")
        : [currentUser];
      users.forEach(u=>{
        const jours = localData[currentWeek][u] || ["","","","","",""];
        tablesContainer.insertAdjacentHTML("beforeend", buildTableHTML(u, jours));
      });
      renderSummary(currentUser==="Admin", currentUser);
      attachCommentListeners();
    }).catch(err=> console.error("Erreur loadWeek:",err));
}

function buildTableHTML(user, jours) {
  let html = `<div class="user-block"><h3>${user} - ${currentWeek}</h3><table><thead><tr><th>Jour</th><th>Date</th><th>Heures</th></tr></thead><tbody>`;
  ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"].forEach((day,i)=>{
    html += `<tr><td>${day}</td><td>${datesSemaine[i]}</td><td><input list="absences" type="text" value="${jours[i]}" data-user="${user}" data-day="${i}"></td></tr>`;
  });
  html += `</tbody></table><textarea class="comment-box" placeholder="Commentaire pour ${user}" data-user="${user}">${jours[5]}</textarea></div>`;
  return html;
}

function attachCommentListeners() {
  document.querySelectorAll('textarea.comment-box').forEach(txt=>{
    txt.addEventListener('change',e=>{
      const user = e.target.dataset.user;
      const comment = e.target.value;
      db.collection('heures')
        .where('semaine','==',currentWeek)
        .where('ouvrier','==',user)
        .get().then(snap=>{
          snap.forEach(doc=> doc.ref.set({ commentaire: comment },{ merge:true}));
        });
    });
  });
}

function renderSummary(isAdmin, userName) {
  const summaryContainer = document.getElementById("summaryContainer");
  let html = isAdmin
    ? "<h3>Récapitulatif des totaux</h3><table><thead><tr><th>Ouvrier</th><th>Total</th><th>Delta</th></tr></thead><tbody>"
    : `<h3>Vos heures</h3><table><thead><tr><th>Total</th><th>Delta</th></tr></thead><tbody>`;
  const rows = isAdmin
    ? Object.values(passwords).filter(u=>u!="Admin").map(u=>[u, localData[currentWeek][u]||[]])
    : [[userName, localData[currentWeek][userName]||[]]];
  rows.forEach(([u, jours])=>{
    let total=0;jours.forEach(h=>{if(h&&h!=="Congé"&&h!=="Maladie"&&h!=="Formation"&&h!=="Férié"){const [hh,mm]=h.split(":").map(Number);total+=hh+(mm||0)/60;}});
    const delta=(total-40).toFixed(2);
    if(isAdmin) html+=`<tr><td>${u}</td><td>${total.toFixed(2)}</td><td style="color:${delta>=0?'green':'orange'}">${delta>=0?'+':''}${delta}</td></tr>`;
    else html+=`<tr><td>${total.toFixed(2)}</td><td style="color:${delta>=0?'green':'orange'}">${delta>=0?'+':''}${delta}</td></tr>`;
  });
  html += `</tbody></table>`;
  summaryContainer.innerHTML = html;
}

function saveWeek() {
  const inputs = document.querySelectorAll("#tablesContainer input");
  inputs.forEach(input=>{
    const u = input.dataset.user; const d = parseInt(input.dataset.day);
    const field = ["lundi","mardi","mercredi","jeudi","vendredi"][d];
    const val = input.value;
    db.collection("heures").where("semaine","==",currentWeek).where("ouvrier","==",u).get()
      .then(snap=>{
        if(snap.empty){ const obj={semaine:currentWeek,ouvrier:u}; obj[field]=val; db.collection("heures").add(obj);} 
        else snap.forEach(doc=>doc.ref.set({[field]:val},{merge:true}));
      });
  });
  alert("Enregistré"); loadWeek();
}

function exportCSV() {
  const namePart = `${currentWeek}`;
  let csv="Semaine,Ouvrier,Lundi,Mardi,Mercredi,Jeudi,Vendredi,Commentaire\n";
  Object.values(passwords).filter(u=>u!="Admin").forEach(u=>{
    const jours = localData[currentWeek][u]||[];
    const com = jours[5]||"";
    csv += `${currentWeek},${u},${jours.slice(0,5).join(",")},${com}\n`;
  });
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`Heures_${namePart}.csv`; a.click();
}

function printAll() { document.title=`Recap_${currentWeek}`; window.print(); }

function loadYearlyRecap() {
  const yearlyData = {}; // { Mike: [0,0,0,0,0,0,0,0,0,0,0,0] }

  db.collection("heures").get().then(snap=>{
    snap.forEach(doc=>{
      const d=doc.data();
      const wnum = parseInt(d.semaine.slice(1));
      const datesOfWeek = getDatesOfWeek(wnum);

      ["lundi","mardi","mercredi","jeudi","vendredi"].forEach((day, i)=>{
        const v=d[day];
        if(v && !["Congé","Maladie","Férié","Formation"].includes(v)){
          const date = datesOfWeek[i];
          const monthIndex = date.getMonth(); // 0=Jan
          const [hh,mm]=v.split(":").map(Number);
          if(!yearlyData[d.ouvrier]) yearlyData[d.ouvrier]=new Array(12).fill(0);
          yearlyData[d.ouvrier][monthIndex] += hh + (mm||0)/60;
        }
      });
    });

    let html = "";
    if(currentUser==="Admin"){
      html += "<h3>Récapitulatif annuel par ouvrier</h3><table><thead><tr><th>Ouvrier</th>";
      for(let i=0;i<12;i++) html+=`<th>${["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"][i]}</th>`;
      html += "</tr></thead><tbody>";
      Object.entries(yearlyData).forEach(([u,arr])=>{
        html+=`<tr><td>${u}</td>`;
        arr.forEach(val=> html+=`<td>${val.toFixed(1)}</td>`);
        html+="</tr>";
      });
      html+="</tbody></table>";
    } else {
      html += `<h3>Vos totaux annuels</h3><table><thead><tr><th>Mois</th><th>Heures</th></tr></thead><tbody>`;
      (yearlyData[currentUser]||[]).forEach((val,i)=>{
        html+=`<tr><td>${["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"][i]}</td><td>${val.toFixed(1)}</td></tr>`;
      });
      html+="</tbody></table>";
    }

    document.getElementById("summaryContainer").innerHTML = html;
  });
}


document.getElementById("password").addEventListener("keydown",e=>{if(e.key==="Enter")checkLogin();});
