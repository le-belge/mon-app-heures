console.log("⚡ Initialisation Firestore...");

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

console.log("🚀 Init terminé, vérifie dans Firestore.");
