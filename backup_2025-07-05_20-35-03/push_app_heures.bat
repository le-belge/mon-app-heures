@echo off
echo -------------------------------------------------
echo Deploiement GitHub Pages pour mon app heures
echo -------------------------------------------------
cd /d "F:\mon app heures"
git add .
git commit -m "maj auto via batch"
git push
echo -------------------------------------------------
echo Fini !
pause
