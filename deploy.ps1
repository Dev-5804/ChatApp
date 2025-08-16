# Deployment script for Railway/Render (Windows)
Write-Host "🚀 Starting deployment process..." -ForegroundColor Green

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
npm install

# Build frontend
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
npm run build

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
Set-Location ..

Write-Host "✅ Deployment setup complete!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Push your code to GitHub" -ForegroundColor White
Write-Host "2. Connect your repository to Railway/Render" -ForegroundColor White
Write-Host "3. Add environment variables" -ForegroundColor White
Write-Host "4. Deploy!" -ForegroundColor White
