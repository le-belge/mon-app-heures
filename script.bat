@echo off
echo ============================================
echo 🚀 Déploiement sur GitHub Pages (sans suppression locale)
echo ============================================

REM On se place dans le dossier du projet Git
cd /d %~dp0

echo ✅ Ajout des fichiers modifiés
git add .

echo 📝 Commit
git commit -m "Update site XLG"

echo 🚀 Push vers GitHub
git push

echo ✅ Déploiement terminé, fichiers locaux intacts.
pause
