firebase.initializeApp({
  apiKey: "AIzaSyBSnnmaodnDOqIzRZdTsZeOJlGjmmo0_dk",
  authDomain: "pointage-heures.firebaseapp.com",
  projectId: "pointage-heures"
});
const db = firebase.firestore();

async function charger() {
  const ouvrier = document.getElementById("ouvrier").value.trim();
  const semaine = document.getElementById("semaine").value.trim();
  const recap = document.getElementById("recap");
  recap.textContent = "Chargement...";

  const snapshot = await db.collection("heures")
    .where("ouvrier", "==", ouvrier)
    .where("semaine", "==", semaine)
    .get();

  if (snapshot.empty) {
    recap.textContent = `Aucune heure trouvée pour ${ouvrier} semaine ${semaine}`;
    remplir({});
  } else {
    snapshot.forEach(doc => {
      const data = doc.data();
      remplir(data);
      recap.textContent = `Heures trouvées : total ${data.total} h, delta ${data.delta} h`;
    });
  }
}

function remplir(data) {
  ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(j => {
    document.getElementById(j).value = data[j] || "";
  });
}

async function sauver() {
  const ouvrier = document.getElementById("ouvrier").value.trim();
  const semaine = document.getElementById("semaine").value.trim();
  let total = 0;
  let data = { ouvrier, semaine, timestamp: new Date() };

  ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].forEach(j => {
    const val = document.getElementById(j).value.trim();
    data[j] = val;
    const num = parseFloat(val.replace(":", "."));
    if (!isNaN(num)) total += num;
  });
  data.total = total.toFixed(2);
  data.delta = (total - 40).toFixed(2);

  await db.collection("heures").add(data);
  document.getElementById("recap").textContent = `Sauvegardé : total ${data.total} h, delta ${data.delta} h`;
}
