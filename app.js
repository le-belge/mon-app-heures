// ========= VARIABLES =========
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
      const loginDiv = document.getElementById("login");
      const appDiv = document.getElementById("app");
      const welcome = document.getElementById("welcome");
      if(loginDiv) loginDiv.style.display = "none";
      if(appDiv) appDiv.style.display = "block";
      if(welcome) welcome.textContent = "Bienvenue " + currentUser;

      adjustDisplayForRole();
      setTimeout(()=>{
        if(currentUser === "Admin") {
          initWeekSelector();
          loadWeek();
        }
        loadMonthlyRecap();
      }, 50);
    } else {
      const loginError = document.getElementById("loginError");
      if(loginError) loginError.textContent = "Code inconnu.";
    }
  });
}
document.getElementById("pass
