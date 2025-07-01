const passwords = {
  "nm08110": "Mike",
  "ra08110": "Alex",
  "rb08110": "Ben",
  "lm08110": "Marc",
  "do08110": "Oliv",
  "admin08110": "Admin"
};

let currentUser = "";
let currentWeek = "S23";
let data = JSON.parse(localStorage.getItem("heures")) || {};

console.log("JS chargé !");

// Récap avant loadWeek
function renderSummary(isAdmin, userName) {
  const summaryContainer = document.getElementById("summaryContainer");
  summaryContainer.innerHTML = isAdmin ? "<h3>Récapitulatif des totaux par ouvrier</h3>" : "<h3>Récapitulatif de vos heures</h3>";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Ouvrier</th><th>Total heures</th><th>Delta vs 40h</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  if (isAdmin) {
    Object.keys(data[currentWeek]).forEach(user => {
      if (user === "Admin") return;
      let total = 0;
      data[currentWeek][user].forEach(h => {
        if (h && !["Congé", "Maladie", "Formation"].includes(h)) {
          const [hh, mm] = h.split(":").map(Number);
          total += hh + mm / 60;
        }
      });
      const delta = total - 40;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${user}</td><td>${total.toFixed(2)}</td><td style="color:${delta>0?'green':delta<0?'orange':'black'}">${delta>=0?"+":""}${delta.toFixed(2)}</td>`;
      tbody.appendChild(tr);
    });
  } else {
    let total = 0;
    data[currentWeek][userName].forEach(h => {
      if (h && !["Congé", "Maladie", "Formation"].includes(h)) {
        const [hh, mm] = h.split(":").map(Number);
        total += hh + mm / 60;
      }
    });
    const delta = total - 40;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${userName}</td><td>${total.toFixed(2)}</td><td style="color:${delta>0?'green':delta<0?'orange':'black'}">${delta>=0?"+":""}${delta.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  summaryContainer.appendChild(table);
}

function checkLogin() {
  const pass = document.getElementById("password").value.trim();
  if (passwords[pass]) {
    currentUser = passwords[pass];
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("welcome").textContent = "Bienvenue " + currentUser;
    initWeekSelector();
    loadWeek();
  } else {
    document.getElementById("loginError").textContent = "Mot de passe incorrect.";
  }
}

function logout() {
  currentUser = "";
  document.getElementById("app").style.display = "none";
  document.getElementById("login").style.display = "block";
  document.getElementById("password").value = "";
  document.getElementById("loginError").textContent = "";
}

function initWeekSelector() {
  const selector = document.getElementById("weekSelector");
  selector.innerHTML = "";
  for (let i = 23; i <= 28; i++) {
    let opt = document.createElement("option");
    opt.value = "S" + i;
    opt.text = "S" + i;
    if ("S" + i === currentWeek) opt.selected = true;
    selector.appendChild(opt);
  }
}

function getMondayDateOfWeek(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  if (dow <= 4)
    simple.setDate(simple.getDate() - simple.getDay() + 1);
  else
    simple.setDate(simple.getDate() + 8 - simple.getDay());
  return simple;
}

function formatDate(date) {
  return ("0" + date.getDate()).slice(-2) + "/" + ("0" + (date.getMonth() + 1)).slice(-2);
}

function loadWeek() {
  currentWeek = document.getElementById("weekSelector").value;
  const tablesContainer = document.getElementById("tablesContainer");
  const summaryContainer = document.getElementById("summaryContainer");
  tablesContainer.innerHTML = "";
  summaryContainer.innerHTML = "";

  const year = new Date().getFullYear();
  const weekNumber = parseInt(currentWeek.slice(1));
  const monday = getMondayDateOfWeek(year, weekNumber);
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }

  if (!data[currentWeek]) data[currentWeek] = {};

  if (currentUser === "Admin") {
    Object.keys(passwords).forEach(pass => {
      const user = passwords[pass];
      if (user === "Admin") return;
      if (!data[currentWeek][user]) data[currentWeek][user] = ["", "", "", "", ""];
      tablesContainer.appendChild(createUserTable(user, currentWeek, days, dates));
    });
    renderSummary(true);
  } else {
    if (!data[currentWeek][currentUser]) data[currentWeek][currentUser] = ["", "", "", "", ""];
    tablesContainer.appendChild(createUserTable(currentUser, currentWeek, days, dates));
    renderSummary(false, currentUser);
  }
}

function createUserTable(user, week, days, dates) {
  const container = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = user + " - " + week;
  container.appendChild(title);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Jour</th><th>Date</th><th>Heures</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  data[week][user].forEach((val, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${days[i]}</td><td>${dates[i]}</td><td><input list="absences" type="text" value="${val}" data-user="${user}" data-day="${i}" placeholder="hh:mm ou congé"></td>`;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
  return container;
}

function saveWeek() {
  const inputs = document.querySelectorAll("input[list='absences']");
  inputs.forEach(input => {
    const user = input.getAttribute("data-user");
    const day = input.getAttribute("data-day");
    if (!data[currentWeek][user]) data[currentWeek][user] = ["", "", "", "", ""];
    data[currentWeek][user][day] = input.value;
  });
  localStorage.setItem("heures", JSON.stringify(data));
}

function exportCSV() {
  let csv = "Semaine;Ouvrier;Lundi;Mardi;Mercredi;Jeudi;Vendredi;Total;Delta\n";
  Object.keys(data).forEach(sem => {
    Object.keys(data[sem]).forEach(u => {
      let t = 0;
      let jours = data[sem][u].map(e => {
        if (e && !["Congé", "Maladie", "Formation"].includes(e)) {
          let [h, m] = e.split(":").map(Number);
          t += h + m / 60;
        }
        return e;
      });
      csv += `${sem};${u};${jours.join(";")};${t.toFixed(2)};${(t - 40).toFixed(2)}\n`;
    });
  });
  downloadFile(csv, "heures.csv");
}

function exportJSON() {
  downloadFile(JSON.stringify(data), "heures.json");
}

function importJSON() {
  const file = document.getElementById("importFile").files[0];
  const reader = new FileReader();
  reader.onload = e => {
    data = JSON.parse(e.target.result);
    localStorage.setItem("heures", JSON.stringify(data));
    loadWeek();
  };
  reader.readAsText(file);
}

function downloadFile(content, fileName) {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  a.download = fileName;
  a.click();
}

function newWeek() {
  let next = "S" + (parseInt(currentWeek.slice(1)) + 1);
  if (!data[next]) data[next] = {};
  Object.keys(passwords).forEach(pass => {
    const user = passwords[pass];
    if (user === "Admin") return;
    if (!data[next][user]) data[next][user] = ["", "", "", "", ""];
  });
  currentWeek = next;
  initWeekSelector();
  document.getElementById("weekSelector").value = currentWeek;
  loadWeek();
}
