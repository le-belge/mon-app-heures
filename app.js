const db = firebase.firestore();
let currentUser = "";
let currentWeek = "";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginBtn").addEventListener("click", login);
});

async function login() {
  currentUser = document.getElementById("ouvrier").value.trim();
  currentWeek = document.getElementById("semaine").value.trim();
  document.getElementById("resultat").textContent = "Recherche en cours pour " + currentUser + " semaine " + currentWeek;

  const snapshot = await db.collection("heures")
    .where("ouvrier", "==", currentUser)
    .where("semaine", "==", currentWeek)
    .get();

  if (snapshot.empty) {
    document.getElementById("resultat").textContent = "AUCUN document trouvé.";
  } else {
    let output = "";
    snapshot.forEach(doc => {
      output += JSON.stringify(doc.data(), null, 2);
    });
    document.getElementById("resultat").textContent = output;
  }
}
