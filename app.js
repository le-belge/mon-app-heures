


window.onerror = function(message, source, lineno, colno, error) {
  alert(`Erreur JS : ${message} à la ligne ${lineno}`);
};

const passwords = {
  "nm08110": "Michael",
  "ra08110": "Alexandre",
  "rb08110": "Benoit",
  "lm08110": "Marc",
  "do08110": "Olivier",
  "admin08110": "Admin"
};

let currentUser = "";
let currentWeek = "S23";
let data = JSON.parse(localStorage.getItem("heures")) || {};

console.log("JS chargé !");

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
  calculateTotal();
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

function calculateTotal() {
  let total = 0;
  let usersToCalculate = [];

  if (currentUser === "Admin") {
    usersToCalculate = Object.keys(passwords).filter(p => passwords[p] !== "Admin").map(p => passwords[p]);
  } else {
    usersToCalculate = [currentUser];
  }

  let overallTotal = 0;
  usersToCalculate.forEach(user => {
    const times = data[currentWeek][user] || ["", "", "", "", ""];
    let userTotal = 0;
    times.forEach(t => {
      if (t && !["Congé", "Maladie", "Formation"].includes(t)) {
        const [h, m] = t.split(":").map(Number);
        userTotal += h + m / 60;
      }
    });
    if (user === currentUser) {
      total = userTotal;
    }
    overallTotal += userTotal;
  });

  document.getElementById("weekTotal").textContent = total.toFixed(2);
  const delta = total - 40;
  const deltaEl = document.getElementById("delta");
  deltaEl.textContent = (delta > 0 ? "+" : "") + delta.toFixed(2);
  deltaEl.className = delta > 0 ? "positive" : delta < 0 ? "negative" : "";

  if (currentUser === "Admin") {
    console.log(`Total global semaine ${currentWeek} : ${overallTotal.toFixed(2)}h`);
  }
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

function printAll() {
  let printWindow = window.open("", "", "width=900,height=700");
  printWindow.document.write("<html><head><title>Impression heures ouvriers</title>");
  printWindow.document.write('<style>body { font-family: sans-serif; margin: 20px; } table { border-collapse: collapse; width: 100%; margin-bottom: 30px; } th, td { border: 1px solid #ccc; padding: 5px; text-align: center; } tfoot td { font-weight: bold; }</style>');
  printWindow.document.write("</head><body>");
  printWindow.document.write("<h1>Heures pointées - semaine " + currentWeek + "</h1>");

  const year = new Date().getFullYear();
  const weekNumber = parseInt(currentWeek.slice(1));
  const monday = getMondayDateOfWeek(year, weekNumber);
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

  Object.keys(data[currentWeek]).forEach(user => {
    printWindow.document.write("<h2>" + user + "</h2>");
    printWindow.document.write("<table><thead><tr><th>Jour</th><th>Date</th><th>Heures</th></tr></thead><tbody>");

    let userTotal = 0;

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2);
      const heure = data[currentWeek][user][i] || "";
      if (heure && !["Congé", "Maladie", "Formation"].includes(heure)) {
        const [hh, mm] = heure.split(":").map(Number);
        if (!isNaN(hh) && !isNaN(mm)) userTotal += hh + mm / 60;
      }
      printWindow.document.write("<tr><td>" + days[i] + "</td><td>" + dateStr + "</td><td>" + heure + "</td></tr>");
    }

    printWindow.document.write("</tbody>");
    printWindow.document.write("<tfoot>");
    printWindow.document.write("<tr><td colspan='2'>Total heures</td><td>" + userTotal.toFixed(2) + "</td></tr>");
    printWindow.document.write("<tr><td colspan='2'>Delta vs 40h</td><td>" + ((userTotal - 40 >= 0 ? "+" : "") + (userTotal - 40).toFixed(2)) + "</td></tr>");
    printWindow.document.write("</tfoot>");
    printWindow.document.write("</table>");
  });

  printWindow.document.write("</body></html>");
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}
