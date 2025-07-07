const db = firebase.firestore();
let currentUser = "";
let currentWeek = "";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("saveBtn").addEventListener("click", saveData);
});

async function login() {
  currentUser = document.getElementById("ouvrier").value.trim();
  currentWeek = document.getElementById("semaine").value.trim();
  const docRef = db.collection("heures").doc(`${currentUser}_${currentWeek}`);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    document.getElementById("resultat").textContent = `AUCUN document trouvé pour ${currentUser} semaine ${currentWeek}`;
  } else {
    const data = docSnap.data();
    document.getElementById("resultat").textContent = JSON.stringify(data, null, 2);
    // pré-remplir tes champs si tu veux plus tard
  }
}

async function saveData() {
  const data = {
    ouvrier: currentUser,
    semaine: currentWeek,
    lundi: document.getElementById("lundi")?.value || "",
    mardi: document.getElementById("mardi")?.value || "",
    mercredi: document.getElementById("mercredi")?.value || "",
    jeudi: document.getElementById("jeudi")?.value || "",
    vendredi: document.getElementById("vendredi")?.value || "",
    samedi: document.getElementById("samedi")?.value || "",
    dimanche: document.getElementById("dimanche")?.value || "",
    total: "à calculer",
    delta: "à calculer",
    timestamp: new Date()
  };
  await db.collection("heures").doc(`${currentUser}_${currentWeek}`).set(data);
  document.getElementById("resultat").textContent = "Heures sauvegardées avec succès.";
}
