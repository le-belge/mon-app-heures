console.log("⚡ Script d'initialisation Firestore démarré...");

const semaines = [];
for (let i = 23; i <= 52; i++) {
  semaines.push("S" + i);
}

const ouvriers = ["Mike", "Alex", "Ben", "Marc", "Oliv"];

semaines.forEach(semaine => {
  ouvriers.forEach(user => {
    db.collection("heures").add({
      semaine: semaine,
      ouvrier: user,
      lundi: "",
      mardi: "",
      mercredi: "",
      jeudi: "",
      vendredi: "",
      total: "0.00",
      delta: "0.00",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => console.log(`✅ Document créé pour ${user} (${semaine})`));
  });
});

console.log("🚀 Initialisation terminée (attends 2-3 sec pour voir en BDD).");
