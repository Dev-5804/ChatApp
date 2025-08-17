#!/usr/bin/env powershell

Write-Host "Testing Render deployment for ChatApp..." -ForegroundColor Green

# Test if the server is running
$url = "https://chatter-qwcb.onrender.com/auth/user"
Write-Host "Testing server health at: $url" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 30
    Write-Host "✅ Server is responding with status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Server is working (401 Unauthorized is expected for /auth/user)" -ForegroundColor Green
    } else {
        Write-Host "❌ Server health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test Google OAuth endpoint
$authUrl = "https://chatter-qwcb.onrender.com/auth/google"
Write-Host "Testing Google OAuth endpoint: $authUrl" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $authUrl -Method GET -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 302) {
        Write-Host "✅ Google OAuth redirect is working (302 redirect)" -ForegroundColor Green
        
        # Check if redirect location contains Google OAuth URL
        $location = $response.Headers.Location
        if ($location -like "*accounts.google.com*") {
            Write-Host "✅ OAuth redirects to Google correctly" -ForegroundColor Green
        } else {
            Write-Host "⚠️ OAuth redirect location: $location" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Unexpected response: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 302) {
        Write-Host "✅ Google OAuth redirect is working (302 redirect)" -ForegroundColor Green
        
        # Try to get redirect location
        try {
            $location = $_.Exception.Response.Headers["Location"]
            if ($location -like "*accounts.google.com*") {
                Write-Host "✅ OAuth redirects to Google correctly" -ForegroundColor Green
            } else {
                Write-Host "⚠️ OAuth redirect location: $location" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "✅ OAuth working but couldn't read redirect location" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Google OAuth test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test the main app
$mainUrl = "https://chatter-qwcb.onrender.com"
Write-Host "Testing main app at: $mainUrl" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $mainUrl -Method GET -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Main app is loading correctly" -ForegroundColor Green
        
        # Check if it contains React app content
        if ($response.Content -like "*<div id=*root*") {
            Write-Host "✅ React app is being served" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "❌ Main app test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔍 Manual Test Instructions:" -ForegroundColor Cyan
Write-Host "1. Open https://chatter-qwcb.onrender.com in your browser" -ForegroundColor White
Write-Host "2. Click 'Login with Google'" -ForegroundColor White
Write-Host "3. Complete Google OAuth flow" -ForegroundColor White
Write-Host "4. Verify you're redirected back to https://chatter-qwcb.onrender.com (NOT localhost)" -ForegroundColor White

Write-Host "`nDeployment test completed!" -ForegroundColor Green
Write-Host "If you see errors, check your Render dashboard logs for more details." -ForegroundColor Yellow
