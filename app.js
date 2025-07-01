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
let localData = {};

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
  location.reload();
}

function initWeekSelector() {
  const selector = document.getElementById("weekSelector");
  selector.innerHTML = "";
  for (let i = 23; i <= 52; i++) {
    let opt = document.createElement("option");
    opt.value = "S" + i;
    opt.text = "S" + i;
    if ("S" + i === currentWeek) opt.selected = true;
    selector.appendChild(opt);
  }
}

function loadWeek() {
  currentWeek = document.getElementById("weekSelector").value;
  const tablesContainer = document.getElementById("tablesContainer");
  const summaryContainer = document.getElementById("summaryContainer");
  tablesContainer.innerHTML = "";
  summaryContainer.innerHTML = "";

  db.collection("heures").where("semaine", "==", currentWeek)
    .get()
    .then(snapshot => {
      localData[currentWeek] = {};
      snapshot.forEach(doc => {
        const d = doc.data();
        localData[currentWeek][d.ouvrier] = [d.lundi, d.mardi, d.mercredi, d.jeudi, d.vendredi];
      });

      if (currentUser === "Admin") {
        Object.values(passwords).forEach(user => {
          if (user !== "Admin" && !localData[currentWeek][user]) {
            localData[currentWeek][user] = ["", "", "", "", ""];
          }
        });
      }

      if (currentUser === "Admin") {
        Object.keys(localData[currentWeek]).forEach(user => {
          tablesContainer.appendChild(createUserTable(user, localData[currentWeek][user]));
        });
        renderSummary(true);
      } else {
        let data = localData[currentWeek][currentUser] || ["", "", "", "", ""];
        tablesContainer.appendChild(createUserTable(currentUser, data));
        renderSummary(false, currentUser);
      }
    });
}

function createUserTable(user, jours) {
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const container = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = user + " - " + currentWeek;
  container.appendChild(title);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Jour</th><th>Heures</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  days.forEach((day, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${day}</td><td><input list="absences" type="text" value="${jours[i] || ""}" data-user="${user}" data-day="${i}"></td>`;
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
    if (!localData[currentWeek][user]) localData[currentWeek][user] = ["", "", "", "", ""];
    localData[currentWeek][user][day] = input.value;
  });

  Object.keys(localData[currentWeek]).forEach(user => {
    let jours = localData[currentWeek][user];
    let total = 0;
    jours.forEach(h => {
      if (h && !["Congé", "Maladie", "Formation"].includes(h)) {
        let [hh, mm] = h.split(":").map(Number);
        total += hh + (mm || 0) / 60;
      }
    });
    let delta = total - 40;
    db.collection("heures").add({
      semaine: currentWeek,
      ouvrier: user,
      lundi: jours[0],
      mardi: jours[1],
      mercredi: jours[2],
      jeudi: jours[3],
      vendredi: jours[4],
      total: total.toFixed(2),
      delta: delta.toFixed(2),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => console.log(`✅ Enregistré ${user} ${currentWeek}`));
  });
  alert("Heures sauvegardées dans Firestore");
  loadWeek();
}

function renderSummary(isAdmin, userName) {
  const summaryContainer = document.getElementById("summaryContainer");
  summaryContainer.innerHTML = isAdmin ? "<h3>Récapitulatif des totaux</h3>" : "<h3>Vos heures</h3>";
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Ouvrier</th><th>Total</th><th>Delta</th></tr></thead>";
  const tbody = document.createElement("tbody");

  if (isAdmin) {
    Object.keys(localData[currentWeek]).forEach(user => {
      let jours = localData[currentWeek][user];
      let total = 0;
      jours.forEach(h => {
        if (h && !["Congé", "Maladie", "Formation"].includes(h)) {
          let [hh, mm] = h.split(":").map(Number);
          total += hh + (mm || 0) / 60;
        }
      });
      let delta = total - 40;
      let tr = document.createElement("tr");
      tr.innerHTML = `<td>${user}</td><td>${total.toFixed(2)}</td><td style="color:${delta>0?'green':delta<0?'orange':'black'}">${delta>=0?"+":""}${delta.toFixed(2)}</td>`;
      tbody.appendChild(tr);
    });
  } else {
    let jours = localData[currentWeek][userName] || ["", "", "", "", ""];
    let total = 0;
    jours.forEach(h => {
      if (h && !["Congé", "Maladie", "Formation"].includes(h)) {
        let [hh, mm] = h.split(":").map(Number);
        total += hh + (mm || 0) / 60;
      }
    });
    let delta = total - 40;
    let tr = document.createElement("tr");
    tr.innerHTML = `<td>${userName}</td><td>${total.toFixed(2)}</td><td style="color:${delta>0?'green':delta<0?'orange':'black'}">${delta>=0?"+":""}${delta.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  summaryContainer.appendChild(table);
}

// Exports
function exportCSV() {
  let csv = "Semaine,Ouvrier,Lundi,Mardi,Mercredi,Jeudi,Vendredi,Total,Delta\n";
  Object.keys(localData[currentWeek]).forEach(user => {
    let jours = localData[currentWeek][user];
    let total = 0;
    jours.forEach(h => {
      if (h && !["Congé", "Maladie", "Formation"].includes(h)) {
        let [hh, mm] = h.split(":").map(Number);
        total += hh + (mm || 0) / 60;
      }
    });
    let delta = total - 40;
    csv += `${currentWeek},${user},${jours.join(",")},${total.toFixed(2)},${delta.toFixed(2)}\n`;
  });
  let blob = new Blob([csv], { type: "text/csv" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${currentWeek}.csv`;
  a.click();
}

function exportJSON() {
  let data = localData[currentWeek];
  let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${currentWeek}.json`;
  a.click();
}

function printAll() {
  window.print();
}
