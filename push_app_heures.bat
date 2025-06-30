@echo off
F:
cd "mon app heures"

git init

git add .

git commit -m "Mise à jour app heures"

REM On ignore l'erreur si remote existe déjà
git remote add origin https://github.com/le-belge/mon-app-heures.git 2>nul

REM Force la branche principale à main
git branch -M main

REM Récupère les dernières modifications du dépôt distant
git pull origin main --rebase

REM Pousse les commits locaux sur GitHub
git push -u origin main

pause
