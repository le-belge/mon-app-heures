@echo off
F:
cd "mon app heures"

git add .
git commit -m "Mise à jour fichiers corrigés app heures"
git pull origin main --rebase
git push origin main

pause

