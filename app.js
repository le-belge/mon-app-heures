// Initialisation des mots de passe (à adapter si nécessaire)
const passwords = {
  "nm08110": "Mike",
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

// -- Gestion de la connexion/déconnexion ------------------------------------------------

function checkLogin() {
  const pass = document.getElementById("password").value.trim();
  if (passwords[pass]) {
    currentUser = passwords[pass];
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("welcome").textContent = `Bienvenue ${currentUser}`;
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

function logout() {
  location.reload();
}

// -- Sélecteur de semaine ----------------------------------------------------------------

function initWeekSelector() {
  const selector = document.getElementById("weekSelector");
  selector.innerHTML = "";
  for (let i = 23; i <= 52; i++) {
    const opt = document.createElement("option");
    opt.value = `S${i}`;
    opt.text = `S${i}`;
    if (opt.value === currentWeek) opt.selected = true;
    selector.appendChild(opt);
  }
}

// Calcule les dates (JJ/MM) du lundi au vendredi pour une semaine donnée
function getDatesOfWeek(weekNumber) {
  const year = new Date().getFullYear();
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  const dow = simple.getDay();
  const monday = new Date(simple);
  if (dow <= 4) monday.setDate(simple.getDate() - dow + 1);
  else monday.setDate(simple.getDate() + 8 - dow);
  let dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(
      `${("0" + d.getDate()).slice(-2)}/${("0" + (d.getMonth() + 1)).slice(-2)}`
    );
  }
  return dates;
}

// Charge et affiche la semaine
function loadWeek() {
  currentWeek = document.getElementById("weekSelector").value;
  datesSemaine = getDatesOfWeek(parseInt(currentWeek.slice(1), 10));
  const tablesContainer = document.getElementById("tablesContainer");
  const summaryContainer = document.getElementById("summaryContainer");
  tablesContainer.innerHTML = "";
  summaryContainer.innerHTML = "";

  db.collection("heures")
    .where("semaine", "==", currentWeek)
    .get()
    .then(snapshot => {
      localData[currentWeek] = {};
      snapshot.forEach(doc => {
        const d = doc.data();
        localData[currentWeek][d.ouvrier] = [
          d.lundi || "",
          d.mardi || "",
          d.mercredi || "",
          d.jeudi || "",
          d.vendredi || ""
        ];
      });

      // Si Admin, afficher tous ; sinon, uniquement l'utilisateur courant
      const users =
        currentUser === "Admin"
          ? Object.values(passwords).filter(u => u !== "Admin")
          : [currentUser];

      users.forEach(user => {
        const jours = localData[currentWeek][user] || ["", "", "", "", ""];
        tablesContainer.insertAdjacentHTML(
          "beforeend",
          buildTableHTML(user, jours)
        );
      });

      renderSummary(currentUser === "Admin", currentUser);
    })
    .catch(err => {
      console.error("Erreur loadWeek:", err);
      tablesContainer.innerHTML =
        "<p>Erreur de chargement, voir console.</p>";
    });
}

// -- Construction du tableau horaire pour un utilisateur ---------------------------------

function buildTableHTML(user, jours) {
  let html = `
    <h3>${user} - ${currentWeek}</h3>
    <table class="hours-table">
      <thead>
        <tr><th>Jour</th><th>Date</th><th>Heures</th></tr>
      </thead>
      <tbody>
  `;

  ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].forEach(
    (day, i) => {
      html += `
        <tr>
          <td>${day}</td>
          <td>${datesSemaine[i]}</td>
          <td>
            <input
              type="text"
              data-user="${user}"
              data-day="${i}"
              value="${jours[i]}"
              placeholder="hh:mm"
            />
          </td>
        </tr>
      `;
    }
  );

  html += `
      </tbody>
    </table>
  `;
  return html;
}

// -- Rendu du résumé (hebdo ou mensuel en Admin) -----------------------------------------

function renderSummary(isAdmin, userName) {
  const summaryContainer = document.getElementById("summaryContainer");

  if (isAdmin) {
    // Tableau des totaux pour chaque ouvrier
    let html = `
      <h3>Récapitulatif des totaux</h3>
      <table class="summary-table">
        <thead>
          <tr><th>Ouvrier</th><th>Total (h)</th><th>Delta (h)</th></tr>
        </thead>
        <tbody>
    `;

    Object.entries(localData[currentWeek]).forEach(([user, jours]) => {
      let total = 0;
      jours.forEach(h => {
        if (
          h &&
          !["Congé", "Maladie", "Formation", "Férié"].includes(h)
        ) {
          const [hh, mm] = h.split(":").map(Number);
          total += hh + (mm || 0) / 60;
        }
      });
      const delta = total - 40;
      html += `
        <tr>
          <td>${user}</td>
          <td>${total.toFixed(2)}</td>
          <td>${delta >= 0 ? "+" : ""}${delta.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
    summaryContainer.innerHTML = html;
  } else {
    // Résumé personnel
    const jours = localData[currentWeek][userName] || [
      "",
      "",
      "",
      "",
      ""
    ];
    let total = 0;
    jours.forEach(h => {
      if (
        h &&
        !["Congé", "Maladie", "Formation", "Férié"].includes(h)
      ) {
        const [hh, mm] = h.split(":").map(Number);
        total += hh + (mm || 0) / 60;
      }
    });
    const delta = total - 40;
    summaryContainer.innerHTML = `
      <h3>Vos heures</h3>
      <p>Total : ${total.toFixed(2)} h (Delta : ${
      delta >= 0 ? "+" : ""
    }${delta.toFixed(2)} h)</p>
    `;
  }
}

// -- Sauvegarde de la semaine ------------------------------------------------------------

function saveWeek() {
  const inputs = document.querySelectorAll(
    "#tablesContainer input"
  );
  inputs.forEach(input => {
    const u = input.getAttribute("data-user");
    const d = parseInt(input.getAttribute("data-day"), 10);
    const field = [
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi"
    ][d];
    const value = input.value.trim();

    const update = { semaine: currentWeek, ouvrier: u };
    update[field] = value;

    db.collection("heures")
      .where("semaine", "==", currentWeek)
      .where("ouvrier", "==", u)
      .get()
      .then(snap => {
        if (snap.empty) {
          db.collection("heures").add(update);
        } else {
          snap.forEach(doc =>
            doc.ref.set(update, { merge: true })
          );
        }
      });
  });

  alert("Enregistré");
  loadWeek();
}

// -- Export CSV ----------------------------------------------------------------------------

function exportCSV() {
  const namePart = currentWeek;
  let csv =
    "Semaine,Ouvrier,Lundi,Mardi,Mercredi,Jeudi,Vendredi\n";
  Object.entries(localData[currentWeek]).forEach(
    ([u, jours]) => {
      csv += `${currentWeek},${u},${jours.join(",")}\n`;
    }
  );
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Heures_${namePart}.csv`;
  a.click();
}

// -- Impression PDF -------------------------------------------------------------------------

function printAll() {
  document.title = `Recap_${currentWeek}`;
  window.print();
}

// -- Notes admin & récap mensuel ----------------------------------------------------------

function saveAdminNote() {
  const note = document.getElementById("adminNote").value;
  db.collection("notes")
    .doc(`mois_${currentMonth}`)
    .set({ note, month: currentMonth });
  alert("Note admin sauvegardée");
}

function loadMonthlyRecap() {
  currentMonth = parseInt(
    document.getElementById("monthSelector").value,
    10
  );
  const start = new Date(
    new Date().getFullYear(),
    currentMonth - 1,
    1
  );
  const end = new Date(
    new Date().getFullYear(),
    currentMonth,
    0
  );

  db.collection("heures")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get()
    .then(snap => {
      const data = {};
      snap.forEach(doc => {
        const d = doc.data();
        if (!data[d.ouvrier]) {
          data[d.ouvrier] = {
            total: 0,
            conges: 0,
            maladies: 0,
            feries: 0
          };
        }
        ["lundi", "mardi", "mercredi", "jeudi", "vendredi"].forEach(
          day => {
            const v = d[day];
            if (v === "Congé") data[d.ouvrier].conges++;
            else if (v === "Maladie")
              data[d.ouvrier].maladies++;
            else if (v === "Férié")
              data[d.ouvrier].feries++;
            else if (v) {
              const [hh, mm] = v.split(":").map(Number);
              data[d.ouvrier].total +=
                hh + (mm || 0) / 60;
            }
          }
        );
      });

      let html = `
        <h3>Récapitulatif mensuel</h3>
        <table class="summary-table">
          <thead>
            <tr>
              <th>Ouvrier</th><th>Total (h)</th>
              <th>Congés</th><th>Maladie</th><th>Férié</th>
            </tr>
          </thead>
          <tbody>
      `;
      Object.entries(data).forEach(([u, d]) => {
        html += `
          <tr>
            <td>${u}</td>
            <td>${d.total.toFixed(2)}</td>
            <td>${d.conges}</td>
            <td>${d.maladies}</td>
            <td>${d.feries}</td>
          </tr>
        `;
      });
      html += `
          </tbody>
        </table>
      `;
      document.getElementById(
        "summaryContainer"
      ).innerHTML = html;
    })
    .catch(err =>
      console.error("Erreur recap mensuel:", err)
    );
}

// -- Écoute de la touche Entrée ----------------------------------------------------------

document
  .getElementById("password")
  .addEventListener("keydown", e => {
    if (e.key === "Enter") checkLogin();
  });
