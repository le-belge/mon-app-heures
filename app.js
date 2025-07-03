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
    const opt = document.createElement("option");
    opt.value = "S" + i;
    opt.text = "S" + i;
    if (opt.value === currentWeek) opt.selected = true;
    selector.appendChild(opt);
  }
}

function getDatesOfWeek(weekNumber) {
  const year = new Date().getFullYear();
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  const dow = simple.getDay();
  const monday = new Date(simple);
  if (dow <= 4) monday.setDate(simple.getDate() - dow + 1);
  else monday.setDate(simple.getDate() + 8 - dow);
  let dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(
      ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2)
    );
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
        localData[currentWeek][d.ouvrier] = [
          d.lundi || "", d.mardi || "", d.mercredi || "", d.jeudi || "", d.vendredi || "",
          d.samedi || "", d.dimanche || "", d.commentaire || ""
        ];
      });

      if (currentUser === "Admin") {
        Object.values(passwords).forEach(user => {
          if (user !== "Admin" && !localData[currentWeek][user]) {
            localData[currentWeek][user] = ["", "", "", "", "", "", "", ""];
          }
        });
      }

      const users = currentUser === "Admin"
        ? Object.keys(localData[currentWeek])
        : [currentUser];

      users.forEach(user => {
        tablesContainer.appendChild(createUserTable(user, localData[currentWeek][user]));
      });

      renderSummary(currentUser === "Admin", currentUser);
    });
}

function createUserTable(user, jours) {
  const days = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
  const container = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `${user} - ${currentWeek}`;
  container.appendChild(title);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Jour</th><th>Date</th><th>Heures</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  days.forEach((day, i) => {
    const tr = document.createElement("tr");
    const val = jours && jours[i] ? jours[i] : "";
    tr.innerHTML = `
      <td>${day}</td>
      <td>${datesSemaine[i]}</td>
      <td><input list="absences" type="text" value="${val}" data-user="${user}" data-day="${i}"></td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  // Commentaire
  const commentBox = document.createElement("textarea");
  commentBox.rows = 2;
  commentBox.placeholder = "Commentaire pour " + user;
  commentBox.value = jours && jours[7] ? jours[7] : "";
  commentBox.onchange = () => saveComment(user, currentWeek, commentBox.value);
  container.appendChild(commentBox);

  return container;
}

function saveComment(user, week, comment) {
  db.collection("heures")
    .where("ouvrier","==",user)
    .where("semaine","==",week)
    .get()
    .then(snap => {
      snap.forEach(doc => doc.ref.update({ commentaire: comment }));
    });
}

function renderSummary(isAdmin, userName) {
  const summaryContainer = document.getElementById("summaryContainer");
  summaryContainer.innerHTML = isAdmin
    ? "<h3>Récapitulatif des totaux</h3>"
    : "<h3>Vos heures</h3>";

  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Ouvrier</th><th>Total</th><th>Delta</th><th>Congés</th><th>Maladie</th></tr></thead>";
  const tbody = document.createElement("tbody");

  const computeRow = (user, jours) => {
    let total=0, conges=0, maladies=0;
    jours.forEach(h => {
      if (h==="Congé") conges++;
      else if (h==="Maladie") maladies++;
      else if (h && !["Congé","Maladie","Formation","Férié"].includes(h)) {
        const [hh,mm]=h.split(":").map(Number);
        total+=hh+(mm||0)/60;
      }
    });
    const delta = total-40;
    return `<tr><td>${user}</td>
      <td>${total.toFixed(2)}</td>
      <td style="color:${delta>0?'green':delta<0?'orange':'black'}">
        ${delta>=0?"+":""}${delta.toFixed(2)}
      </td>
      <td>${conges}</td><td>${maladies}</td></tr>`;
  };

  if (isAdmin) {
    Object.keys(localData[currentWeek]).forEach(u => {
      tbody.innerHTML+=computeRow(u, localData[currentWeek][u]);
    });
  } else {
    tbody.innerHTML+=computeRow(userName, localData[currentWeek][userName]);
  }

  table.appendChild(tbody);
  summaryContainer.appendChild(table);
}

function saveWeek() {
  const inputs = document.querySelectorAll("input[list='absences']");
  inputs.forEach(input => {
    const u = input.getAttribute("data-user");
    const d = parseInt(input.getAttribute("data-day"),10);
    if (!localData[currentWeek][u]) localData[currentWeek][u]=["","","","","","","",""];
    localData[currentWeek][u][d] = input.value;
  });

  const promises = [];
  Object.keys(localData[currentWeek]).forEach(u => {
    const jours = localData[currentWeek][u];
    promises.push(
      db.collection("heures")
        .where("semaine","==",currentWeek)
        .where("ouvrier","==",u)
        .get()
        .then(snap => {
          if (!snap.empty) {
            return Promise.all(snap.docs.map(doc =>
              doc.ref.set({
                semaine: currentWeek, ouvrier: u,
                lundi:jours[0],mardi:jours[1],mercredi:jours[2],
                jeudi:jours[3],vendredi:jours[4],
                samedi:jours[5],dimanche:jours[6],
                commentaire:jours[7],
                timestamp:firebase.firestore.FieldValue.serverTimestamp()
              })
            ));
          } else {
            return db.collection("heures").add({
              semaine: currentWeek, ouvrier: u,
              lundi:jours[0],mardi:jours[1],mercredi:jours[2],
              jeudi:jours[3],vendredi:jours[4],
              samedi:jours[5],dimanche:jours[6],
              commentaire:jours[7],
              timestamp:firebase.firestore.FieldValue.serverTimestamp()
            });
          }
        })
    );
  });

  Promise.all(promises).then(()=>{
    alert("Heures sauvegardées");
    loadWeek();
  });
}

function exportCSV() {
  const namePart = `${currentWeek}_M${currentMonth}`;
  let csv = "Semaine,Ouvrier,Lundi,Mardi,Mercredi,Jeudi,Vendredi,Samedi,Dimanche,Commentaire\n";
  Object.entries(localData[currentWeek]).forEach(([u,jours])=>{
    csv+=`${currentWeek},${u},${jours.join(",")}\n`;
  });
  const blob = new Blob([csv],{type:"text/csv"});
  const a = document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`Recap_${namePart}.csv`;
  a.click();
}

function printAll() {
  const namePart = `${currentWeek}_M${currentMonth}`;
  document.title=`Recap_${namePart}`;
  window.print();
}

function saveAdminNote() {
  const note = document.getElementById("adminNote").value;
  db.collection("notes").doc(`mois_${currentMonth}`)
    .set({ note, month:currentMonth });
  alert("Note admin sauvegardée");
}

function loadMonthlyRecap() {
  currentMonth = parseInt(document.getElementById("monthSelector").value,10);
  const start = new Date(new Date().getFullYear(),currentMonth-1,1);
  const end   = new Date(new Date().getFullYear(),currentMonth,0);
  db.collection("heures")
    .where("timestamp",">=",start)
    .where("timestamp","<=",end)
    .get()
    .then(snap=>{
      const monthlyData={};
      snap.forEach(doc=>{
        const d=doc.data();
        monthlyData[d.ouvrier]=monthlyData[d.ouvrier]||{total:0,conges:0,maladies:0,feries:0};
        ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(day=>{
          const v=d[day];
          if(v==="Congé") monthlyData[d.ouvrier].conges++;
          else if(v==="Maladie") monthlyData[d.ouvrier].maladies++;
          else if(v==="Férié") monthlyData[d.ouvrier].feries++;
          else if(v){
            const [hh,mm]=v.split(":").map(Number);
            monthlyData[d.ouvrier].total+=hh+(mm||0)/60;
          }
        });
      });
      renderMonthlySummary(monthlyData);
    });
}

function renderMonthlySummary(data){
  const sc=document.getElementById("summaryContainer");
  sc.innerHTML="<h3>Récapitulatif mensuel</h3>";
  const t=document.createElement("table");
  t.innerHTML="<thead><tr><th>Ouvrier</th><th>Total</th><th>Congés</th><th>Maladie</th><th>Férié</th></tr></thead>";
  const b=document.createElement("tbody");
  Object.entries(data).forEach(([u,d])=>{
    b.innerHTML+=`<tr><td>${u}</td><td>${d.total.toFixed(2)}</td><td>${d.conges}</td><td>${d.maladies}</td><td>${d.feries}</td></tr>`;
  });
  t.appendChild(b);
  sc.appendChild(t);
}

document.getElementById("password")
  .addEventListener("keydown",e=>{ if(e.key==="Enter") checkLogin(); });
