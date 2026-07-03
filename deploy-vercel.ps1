# RMASC FACTORY — Auto Deploy Script
# Run this in VS Code Terminal (PowerShell)

Write-Host "🚀 RMASC FACTORY — Déploiement automatique" -ForegroundColor Cyan
Write-Host ""

# 1. Push latest code to GitHub
Write-Host "📤 Push vers GitHub..." -ForegroundColor Yellow
cd C:\Users\HP\RMASC
git add -A
git commit -m "Vercel monorepo config — backend serverless"
git push

Write-Host ""
Write-Host "✅ Code poussé sur GitHub !" -ForegroundColor Green
Write-Host ""

# 2. Deploy with Vercel CLI or Extension
Write-Host "📦 Déploiement Vercel..." -ForegroundColor Yellow
Write-Host ""

# Check if Vercel CLI is installed
$vercelPath = Get-Command vercel -ErrorAction SilentlyContinue
if ($vercelPath) {
    vercel --prod
} else {
    Write-Host "⚠️  Vercel CLI non trouvé." -ForegroundColor Red
    Write-Host ""
    Write-Host "Utilisez l'extension Vercel dans VS Code :" -ForegroundColor White
    Write-Host "1. Cliquez sur l'icône Vercel dans la barre latérale gauche" -ForegroundColor White
    Write-Host "2. Connectez-vous avec votre compte GitHub" -ForegroundColor White
    Write-Host "3. Cliquez sur 'Deploy' pour RMASC-ERP" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou installez Vercel CLI et relancez ce script :" -ForegroundColor White
    Write-Host "  npm install -g vercel" -ForegroundColor White
    Write-Host "  vercel --prod" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Terminé !" -ForegroundColor Green
pause
