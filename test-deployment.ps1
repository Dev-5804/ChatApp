#!/usr/bin/env powershell

Write-Host "Testing Render deployment for ChatApp..." -ForegroundColor Green

# Test if the server is running
$url = "https://chatter-qwcb.onrender.com/auth/user"
Write-Host "Testing server health at: $url" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 30
    Write-Host "✅ Server is responding with status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Server health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Google OAuth endpoint
$authUrl = "https://chatter-qwcb.onrender.com/auth/google"
Write-Host "Testing Google OAuth endpoint: $authUrl" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $authUrl -Method GET -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 302) {
        Write-Host "✅ Google OAuth redirect is working (302 redirect)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Unexpected response: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 302) {
        Write-Host "✅ Google OAuth redirect is working (302 redirect)" -ForegroundColor Green
    } else {
        Write-Host "❌ Google OAuth test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDeployment test completed!" -ForegroundColor Green
Write-Host "If you see errors, check your Render dashboard logs for more details." -ForegroundColor Yellow
