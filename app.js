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
let datesSemaine = [];

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
  const firstDay = new Date(year, 0, 1 + (weekNum - 1) * 7);
  const dayOfWeek = firstDay.getDay();
  const monday = new Date(firstDay);
  monday.setDate(firstDay.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
  });
}

function loadWeek() {
  currentWeek = document.getElementById("weekSelector").value;
  datesSemaine = getDatesOfWeek(parseInt(currentWeek.slice(1)));
  const container = document.getElementById("tablesContainer");
  container.innerHTML = "";

  db.collection("heures").where("semaine", "==", currentWeek)
    .get()
    .then(snapshot => {
      const rowsByUser = {};
      snapshot.forEach(doc => {
        const d = doc.data();
        rowsByUser[d.ouvrier] = [
          d.lundi || "",
          d.mardi || "",
          d.mercredi || "",
          d.jeudi || "",
          d.vendredi || ""
        ];
      });

      const users = (currentUser === "Admin")
        ? Object.values(passwords).filter(u => u !== "Admin")
        : [currentUser];

      let html = "";
      users.forEach(u => {
        const jours = rowsByUser[u] || ["", "", "", "", ""];
        html += `<div class="user-block">
                   <h3>${u} - ${currentWeek}</h3>
                   <table>
                     <thead>
                       <tr><th>Jour</th><th>Date</th><th>Heures</th></tr>
                     </thead>
                     <tbody>`;
        ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"].forEach((day, i) => {
          html += `<tr>
                     <td>${day}</td>
                     <td>${datesSemaine[i]}</td>
                     <td><input type="text" value="${jours[i]}" data-user="${u}" data-day="${i}"></td>
                   </tr>`;
        });
        html += `  </tbody>
                   </table>
                 </div>`;
      });

      container.innerHTML = html;
    })
    .catch(err => {
      console.error("Erreur Firestore loadWeek:", err);
      container.innerHTML = "<p style='color:red;'>Erreur de chargement, regarde la console.</p>";
    });
}

function saveWeek() {
  const inputs = document.querySelectorAll("#tablesContainer input");
  inputs.forEach(input => {
    const u = input.getAttribute('data-user');
    const d = input.getAttribute('data-day');
    const value = input.value;
    db.collection("heures")
      .where("semaine", "==", currentWeek)
      .where("ouvrier", "==", u)
      .get()
      .then(snap => {
        if (snap.empty) {
          const obj = { semaine: currentWeek, ouvrier: u };
          obj[['lundi','mardi','mercredi','jeudi','vendredi'][d]] = value;
          db.collection("heures").add(obj);
        } else {
          snap.forEach(doc => {
            const update = {};
            update[['lundi','mardi','mercredi','jeudi','vendredi'][d]] = value;
            doc.ref.set(update, { merge: true });
          });
        }
      });
  });
  alert('Enregistré');
  loadWeek();
}

document.getElementById("password").addEventListener('keydown', e => {
  if (e.key === 'Enter') checkLogin();
});
