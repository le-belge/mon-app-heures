@echo off
echo -------------------------------------------------
echo Déploiement GitHub Pages pour ton app heures
echo -------------------------------------------------

:: Initialise le dépôt si pas déjà fait
git init

:: Configure le dépôt distant
git remote add origin https://github.com/le-belge/mon-app-heures.git

:: Ajoute tous les fichiers
git add .

:: Commit avec un message automatique
git commit -m "deploiement automatique"

:: Pousse sur master
git push -u origin master

echo -------------------------------------------------
echo Fini !
echo Va dans Settings > Pages de ton repo GitHub
echo et active la branche master pour Pages.
echo -------------------------------------------------
pause
