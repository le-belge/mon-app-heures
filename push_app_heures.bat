@echo off
REM Passe sur la lettre F:
F:
REM Se place dans le dossier mon app heures
cd "mon app heures"

REM Initialise le dépôt Git si pas déjà fait
git init

REM Ajoute tous les fichiers
git add .

REM Commit avec message
git commit -m "Mise à jour app heures"

REM Ajoute l'origine distante (ignore l'erreur si déjà configurée)
git remote add origin https://github.com/le-belge/mon-app-heures.git

REM Force la branche principale à main
git branch -M main

REM Pousse vers GitHub
git push -u origin main

pause
