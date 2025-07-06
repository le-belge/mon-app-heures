@echo off
setlocal enabledelayedexpansion

echo -------------------------------------------------
echo [1] Vérification de l'état du dépôt
echo -------------------------------------------------
git status
echo -------------------------------------------------

:: Nettoie un éventuel lock
if exist .git\index.lock (
    echo ⚠ Suppression de index.lock qui bloquait
    del .git\index.lock
)

echo -------------------------------------------------
echo [2] Ajout de tous les fichiers modifiés
echo -------------------------------------------------
git add .

echo -------------------------------------------------
echo [3] Commit automatique
echo -------------------------------------------------
git commit -m "maj"

echo -------------------------------------------------
echo [4] Envoi vers GitHub
echo -------------------------------------------------
git push origin master

echo -------------------------------------------------
echo [5] Récupération des dernières modifs
echo -------------------------------------------------
git pull origin master

:: Log la date et l'heure du déploiement
for /f %%a in ('powershell -command "Get-Date -format \"dd/MM/yyyy HH:mm:ss\" "') do set DATEDEPLOY=%%a
echo Déploiement du %DATEDEPLOY% >> log.txt

echo -------------------------------------------------
echo ✅ Terminé !
echo -------------------------------------------------
echo Ton site est dispo sur :
echo https://le-belge.github.io/mon-app-heures/
echo -------------------------------------------------
pause
