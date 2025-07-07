const db = firebase.firestore();
const days = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
let currentUser = "";
let currentWeek = "S" + getWeekNumber(new Date());

document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    currentUser = savedUser;
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("sessionInfo").style.display = "block";
    document.getElementById("welcome").textContent = `Bienvenue ${currentUser}`;
    initWeekSelector();
    loadWeekData();
  }
});

document.getElementById("password").addEventListener("keydown", e => {
  if (e.key === "Enter") checkLogin();
});

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

async function checkLogin() {
  currentUser = document.getElementById("password")?.value.trim();
  localStorage.setItem("currentUser", currentUser);
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("sessionInfo").style.display = "block";
  document.getElementById("welcome").textContent = `Bienvenue ${currentUser}`;
  initWeekSelector();
  loadWeekData();
}

function initWeekSelector() {
  const weekSelector = document.getElementById("weekSelector");
  weekSelector.innerHTML = "";
  for (let i = 1; i <= 52; i++) {
    const opt = document.createElement("option");
    opt.value = "S" + i;
    opt.textContent = "Semaine " + i;
    if ("S" + i === currentWeek) opt.selected = true;
    weekSelector.appendChild(opt);
  }
}

async function loadWeekData() {
  currentWeek = document.getElementById("weekSelector")?.value || currentWeek;
  const snapshot = await db.collection("heures")
    .where("ouvrier", "==", currentUser)
    .where("semaine", "==", currentWeek)
    .get();

  let data = {};
  if (!snapshot.empty) data = snapshot.docs[0].data();

  let html = `<div class="user-block"><table><tr><th>Jour</th><th>Heures</th></tr>`;
  let total = 0;
  days.forEach(day => {
    let heure = data[day] || "";
    let hValue = heure.includes(":") ? parseFloat(heure.replace(":", ".")) : parseFloat(heure);
    if (!isNaN(hValue)) total += hValue;
    html += `<tr>
      <td>${day.charAt(0).toUpperCase() + day.slice(1)}</td>
      <td><input type="text" id="input_${day}" value="${heure}"></td>
    </tr>`;
  });
  html += `</table>
    <textarea id="commentaire" class="comment-box" placeholder="Commentaire...">${data.commentaire || ""}</textarea>
    <div><button onclick="saveData()">Sauvegarder</button></div>
  </div>`;
  document.getElementById("tablesContainer").innerHTML = html;
  updateSummary(total, data.delta);
}

function updateSummary(total, deltaBdd) {
  const summary = document.getElementById("summaryContainer");
  let deltaCalc = (total - 40).toFixed(2);
  let deltaDisplay = deltaBdd || deltaCalc;
  summary.innerHTML = `<table><tr><th>Total semaine</th><th>Delta</th></tr>
    <tr><td>${total.toFixed(2)} h</td><td>${deltaDisplay >=0 ? "+" : ""}${deltaDisplay} h</td></tr></table>`;
}

async function saveData() {
  let newData = { ouvrier: currentUser, semaine: currentWeek };
  let total = 0;
  days.forEach(day => {
    const val = document.getElementById(`input_${day}`)?.value || "";
    newData[day] = val;
    let hValue = val.includes(":") ? parseFloat(val.replace(":", ".")) : parseFloat(val);
    if (!isNaN(hValue)) total += hValue;
  });
  newData.total = total.toFixed(2);
  newData.delta = (total - 40).toFixed(2);
  newData.commentaire = document.getElementById("commentaire")?.value || "";

  await db.collection("heures").add(newData);
  loadWeekData();
}

function logout() {
  localStorage.removeItem("currentUser");
  location.reload();
}
