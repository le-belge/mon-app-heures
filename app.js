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

console.log("JS chargé !");

function checkLogin() {
  const pass = document.getElementById("password").value.trim();
  if (passwords[pass]) {
    currentUser = passwords[pass];
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("welcome").textContent = "Bienvenue " + currentUser;
    if (currentUser === "Admin") document.getElementById("adminControls").style.display = "block";
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

function getDatesOfWeek(weekNumber) {
  const year = new Date().getFullYear();
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  const dow = simple.getDay();
  let monday = simple;
  if (dow <= 4) monday.setDate(simple.getDate() - simple.getDay() + 1);
  else monday.setDate(simple.getDate() + 8 - simple.getDay());
  let dates = [];
  for (let i = 0; i < 7; i++) {
    let d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push( ("0"+d.getDate()).slice(-2) + "/" + ("0"+(d.getMonth()+1)).slice(-2) );
  }
  return dates;
}

function loadWeek() {
  currentWeek = document.getElementById("weekSelector").value;
  datesSemaine = getDatesOfWeek(parseInt(currentWeek.slice(1)));
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
        // blindé : prend les jours même s'ils n'existent pas encore
        localData[currentWeek][d.ouvrier] = [
          d.lundi || "", d.mardi || "", d.mercredi || "", d.jeudi || "",
          d.vendredi || "", d.samedi || "", d.dimanche || "", d.commentaire || ""
        ];
      });

      if (currentUser === "Admin") {
        Object.values(passwords).forEach(user => {
          if (user !== "Admin" && !localData[currentWeek][user]) {
            localData[currentWeek][user] = ["", "", "", "", "", "", "", ""];
          }
        });
      }

      if (currentUser === "Admin") {
        Object.keys(localData[currentWeek]).forEach(user => {
          tablesContainer.appendChild(createUserTable(user, localData[currentWeek][user]));
        });
      } else {
        let data = localData[currentWeek][currentUser] || ["", "", "", "", "", "", "", ""];
        tablesContainer.appendChild(createUserTable(currentUser, data));
      }
    });
}

function createUserTable(user, jours) {
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const container = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = user + " - " + currentWeek;
  container.appendChild(title);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Jour</th><th>Date</th><th>Heures</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  days.forEach((day, i) => {
    const tr = document.createElement("tr");
    let val = (jours && jours.length > i && jours[i] !== undefined) ? jours[i] : "";
    tr.innerHTML = `<td>${day}</td><td>${datesSemaine[i]}</td>
    <td><input list="absences" type="text" value="${val}" data-user="${user}" data-day="${i}"></td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  const comment = (jours && jours[7]) ? jours[7] : "";
  const commentBox = document.createElement("textarea");
  commentBox.placeholder = "Commentaire pour " + user;
  commentBox.value = comment;
  commentBox.onchange = () => saveComment(user, currentWeek, commentBox.value);
  container.appendChild(commentBox);

  return container;
}

function saveComment(user, week, comment) {
  db.collection("heures")
    .where("ouvrier","==",user)
    .where("semaine","==",week)
    .get()
    .then(snapshot=>{
      snapshot.forEach(doc=>{
        db.collection("heures").doc(doc.id).update({commentaire: comment});
      });
    });
}

function saveAdminNote() {
  const note = document.getElementById("adminNote").value;
  db.collection("notes").doc("mois_"+currentMonth).set({note: note, month: currentMonth});
  alert("Note admin sauvegardée.");
}

function loadMonthlyRecap() {
  currentMonth = parseInt(document.getElementById("monthSelector").value);
  let start = new Date(new Date().getFullYear(), currentMonth-1, 1);
  let end = new Date(new Date().getFullYear(), currentMonth, 0);

  db.collection("heures")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get()
    .then(snapshot => {
      let monthlyData = {};
      snapshot.forEach(doc => {
        let d = doc.data();
        if (!monthlyData[d.ouvrier]) monthlyData[d.ouvrier] = {total:0, conges:0, maladies:0, feries:0};
        ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(day => {
          let val = d[day];
          if (val === "Congé") monthlyData[d.ouvrier].conges++;
          else if (val === "Maladie") monthlyData[d.ouvrier].maladies++;
          else if (val === "Férié") monthlyData[d.ouvrier].feries++;
          else if (val) {
            let [hh, mm] = val.split(":").map(Number);
            monthlyData[d.ouvrier].total += hh + (mm || 0)/60;
          }
        });
      });
      renderMonthlySummary(monthlyData);
    });
}

function renderMonthlySummary(monthlyData) {
  const summaryContainer = document.getElementById("summaryContainer");
  summaryContainer.innerHTML = "<h3>Récapitulatif mensuel</h3>";
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Ouvrier</th><th>Total</th><th>Congés</th><th>Maladies</th><th>Férié</th></tr></thead>";
  const tbody = document.createElement("tbody");

  Object.keys(monthlyData).forEach(user => {
    let d = monthlyData[user];
    tbody.innerHTML += `<tr><td>${user}</td><td>${d.total.toFixed(2)}</td><td>${d.conges}</td><td>${d.maladies}</td><td>${d.feries}</td></tr>`;
  });

  table.appendChild(tbody);
  summaryContainer.appendChild(table);
}

function exportCSV() {
  let namePart = currentWeek + "_M" + currentMonth;
  let csv = "Semaine,Ouvrier,Lundi,Mardi,Mercredi,Jeudi,Vendredi,Samedi,Dimanche,Commentaire\n";
  Object.keys(localData[currentWeek]).forEach(user => {
    let jours = localData[currentWeek][user];
    csv += `${currentWeek},${user},${jours.join(",")}\n`;
  });
  let blob = new Blob([csv], { type: "text/csv" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Recap_${namePart}.csv`;
  a.click();
}

function printAll() {
  let namePart = currentWeek + "_M" + currentMonth;
  document.title = "Recap_" + namePart;
  window.print();
}

document.getElementById("password").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    checkLogin();
  }
});
