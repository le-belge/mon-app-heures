const db = firebase.firestore();
let currentUser = "";
let currentWeek = "";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginBtn").addEventListener("click", login);
});

async function login() {
  currentUser = document.getElementById("ouvrier").value.trim();
  currentWeek = document.getElementById("semaine").value.trim();
  document.getElementById("resultat").textContent = "Chargement...";

  const snapshot = await db.collection("heures").get();
  let found = false;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.ouvrier === currentUser && data.semaine === currentWeek) {
      document.getElementById("resultat").textContent = JSON.stringify(data, null, 2);
      found = true;
    }
  });

  if (!found) {
    document.getElementById("resultat").textContent = "AUCUN document trouvé pour " + currentUser + " semaine " + currentWeek;
  }
}
