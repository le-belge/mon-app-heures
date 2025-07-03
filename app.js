// app.js - Stable base version
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

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyBSnn...",
  authDomain: "pointage-heures.firebaseapp.com",
  projectId: "pointage-heures"
});
const db = firebase.firestore();

function checkLogin() {
  const pass = document.getElementById("password").value.trim();
  if (passwords[pass]) {
    currentUser = passwords[pass];
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    initWeekSelector();
    loadWeek();
  } else {
    document.getElementById("loginError").textContent = "Mot de passe incorrect.";
  }
}

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

function getDatesOfWeek(weekNum) {
  const year = new Date().getFullYear();
  const firstDay = new Date(year,0,1 + (weekNum-1)*7);
  const dayOfWeek = firstDay.getDay();
  const monday = new Date(firstDay);
  monday.setDate(firstDay.getDate() - (dayOfWeek + 6)%7);
  return Array.from({length:5},(_,i)=>{
    const d = new Date(monday);
    d.setDate(monday.getDate()+i);
    return ('0'+d.getDate()).slice(-2) + '/' + ('0'+(d.getMonth()+1)).slice(-2);
  });
}

function loadWeek() {
  currentWeek = document.getElementById("weekSelector").value;
  datesSemaine = getDatesOfWeek(parseInt(currentWeek.slice(1)));
  const container = document.getElementById("tablesContainer");
  container.innerHTML = "";
  
  db.collection("heures").where("semaine","==",currentWeek).get()
    .then(snapshot=>{
      localData[currentWeek] = {};
      snapshot.forEach(doc=>{
        const d=doc.data();
        localData[currentWeek][d.ouvrier]=[d.lundi||"",d.mardi||"",d.mercredi||"",d.jeudi||"",d.vendredi||""];
      });
      const users = currentUser==="Admin"?Object.values(passwords).filter(u=>u!="Admin"): [currentUser];
      users.forEach(u=>{
        if(!localData[currentWeek][u]) localData[currentWeek][u] = ["","","","",""];
        container.appendChild(renderTable(u,localData[currentWeek][u]));
      });
    });
}

function renderTable(user,days){
  const div=document.createElement("div");
  div.innerHTML=`<h3>${user} - ${currentWeek}</h3><table><thead><tr><th>Jour</th><th>Date</th><th>Heures</th></tr></thead><tbody>$
  ${['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].map((day,i)=>
    `<tr><td>${day}</td><td>${datesSemaine[i]}</td><td><input type='text' value='${days[i]}' data-user='${user}' data-day='${i}'></td></tr>`
  ).join('')}
  </tbody></table>`;
  return div;
}

function saveWeek(){
  const inputs=document.querySelectorAll("#tablesContainer input");
  inputs.forEach(i=>{
    const u=i.getAttribute('data-user'),d=i.getAttribute('data-day');
    localData[currentWeek][u][d]=i.value;
  });
  Object.entries(localData[currentWeek]).forEach(([u,jours])=>{
    db.collection("heures").where("semaine","==",currentWeek).where("ouvrier","==",u)
      .get().then(snap=>{
        if(snap.empty){
          db.collection("heures").add({semaine:currentWeek,ouvrier:u,lundi:jours[0],mardi:jours[1],mercredi:jours[2],jeudi:jours[3],vendredi:jours[4]});
        }else{
          snap.forEach(doc=>doc.ref.set({semaine:currentWeek,ouvrier:u,lundi:jours[0],mardi:jours[1],mercredi:jours[2],jeudi:jours[3],vendredi:jours[4]}, {merge:true}));
        }
      });
  });
  alert('Enregistré');
  loadWeek();
}

document.getElementById("password").addEventListener('keydown',e=>{if(e.key==='Enter')checkLogin();});
