# Render Deployment Test Script (Windows)
Write-Host "🚀 Testing Render deployment setup..." -ForegroundColor Green

# Check if required files exist
Write-Host "📋 Checking deployment files..." -ForegroundColor Yellow

if (Test-Path "render.yaml") {
    Write-Host "✅ render.yaml found" -ForegroundColor Green
} else {
    Write-Host "❌ render.yaml missing" -ForegroundColor Red
    exit 1
}

if (Test-Path "server\.env.example") {
    Write-Host "✅ server\.env.example found" -ForegroundColor Green
} else {
    Write-Host "❌ server\.env.example missing" -ForegroundColor Red
}

if (Test-Path "package.json") {
    Write-Host "✅ package.json found" -ForegroundColor Green
} else {
    Write-Host "❌ package.json missing" -ForegroundColor Red
    exit 1
}

if (Test-Path "server\package.json") {
    Write-Host "✅ server\package.json found" -ForegroundColor Green
} else {
    Write-Host "❌ server\package.json missing" -ForegroundColor Red
    exit 1
}

# Test build process
Write-Host ""
Write-Host "🔨 Testing build process..." -ForegroundColor Yellow

Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
npm install --silent
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
    exit 1
}

Write-Host "Building frontend..." -ForegroundColor Gray
npm run build --silent
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Installing backend dependencies..." -ForegroundColor Gray
Set-Location server
npm install --silent
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "🎉 Render deployment test successful!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Push to GitHub: git push origin main" -ForegroundColor White
Write-Host "2. Connect repository to Render" -ForegroundColor White
Write-Host "3. Add environment variables from server\.env.example" -ForegroundColor White
Write-Host "4. Deploy!" -ForegroundColor White
Write-Host ""
Write-Host "📖 See RENDER_DEPLOY.md for detailed instructions" -ForegroundColor Yellow
