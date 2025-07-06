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
  const code = document.getElementById("password")?.value.trim();
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
          if (typeof initWeekSelector === "function") initWeekSelector();
          if (typeof loadWeek === "function") loadWeek();
        }
        if (typeof loadMonthlyRecap === "function") loadMonthlyRecap();
      }, 50);
    } else {
      const loginError = document.getElementById("loginError");
      if(loginError) loginError.textContent = "Code inconnu.";
    }
  });
}
document.getElementById("password").addEventListener("keydown",e=>{
  if(e.key==="Enter") checkLogin();
});
function logout() { location.reload(); }

function adjustDisplayForRole() {
  const tablesContainer = document.getElementById("tablesContainer");
  const summaryContainer = document.getElementById("summaryContainer");
  const monthlyControl = document.getElementById("monthlyControl");
  const monthlyContainer = document.getElementById("monthlyContainer");

  if(currentUser === "Admin") {
    if(tablesContainer) tablesContainer.style.display = "block";
    if(summaryContainer) summaryContainer.style.display = "block";
  } else {
    if(tablesContainer) tablesContainer.style.display = "none";
    if(summaryContainer) summaryContainer.style.display = "none";
  }
  if(monthlyControl) monthlyControl.style.display = "block";
  if(monthlyContainer) monthlyContainer.style.display = "block";
}

// ========= INIT WEEK SELECTOR PROTÉGÉ =========
function initWeekSelector() {
  const weekSelector = document.getElementById("weekSelector");
  if (!weekSelector) {
    console.error("initWeekSelector: #weekSelector introuvable");
    return;
  }

  weekSelector.innerHTML = "";
  for (let i = 1; i <= 52; i++) {
    const opt = document.createElement("option");
    opt.value = "S" + i;
    opt.textContent = "Semaine " + i;
    if ("S" + i === currentWeek) opt.selected = true;
    weekSelector.appendChild(opt);
  }
}
