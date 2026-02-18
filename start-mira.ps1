# Mira Startup Script — runs on boot
# Starts Ollama with CORS + Cloudflare tunnel, then auto-pushes new URL to GitHub

$MIRRA_DIR = "C:\Users\cosmo\OneDrive\Desktop\mirra"
$CLOUDFLARED = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$OLLAMA = "C:\Users\cosmo\AppData\Local\Programs\Ollama\ollama.exe"
$LOG = "$MIRRA_DIR\tunnel.log"

# 1. Kill any existing Ollama + tunnel processes
Write-Host "Stopping existing processes..."
taskkill /F /IM ollama.exe /T 2>$null
taskkill /F /IM cloudflared.exe /T 2>$null
Start-Sleep -Seconds 3

# 2. Start Ollama with CORS enabled (visible window so you can see live logs)
Write-Host "Starting Ollama..."
$env:OLLAMA_ORIGINS = "*"
$env:OLLAMA_HOST = "0.0.0.0:11434"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -Command `"`$env:OLLAMA_ORIGINS='*'; `$env:OLLAMA_HOST='0.0.0.0:11434'; & '$OLLAMA' serve`"" -WindowStyle Normal
Start-Sleep -Seconds 5

# 3. Start Cloudflare tunnel and capture output to log
Write-Host "Starting Cloudflare tunnel..."
Remove-Item $LOG -ErrorAction SilentlyContinue
Start-Process -FilePath $CLOUDFLARED -ArgumentList "tunnel --url http://localhost:11434" -RedirectStandardError $LOG -WindowStyle Hidden

# 4. Wait for tunnel URL to appear in log
Write-Host "Waiting for tunnel URL..."
$tunnelUrl = $null
$attempts = 0
while (-not $tunnelUrl -and $attempts -lt 30) {
    Start-Sleep -Seconds 2
    $attempts++
    if (Test-Path $LOG) {
        $match = Select-String -Path $LOG -Pattern "https://[a-z0-9\-]+\.trycloudflare\.com" | Select-Object -First 1
        if ($match) {
            $tunnelUrl = ($match.Matches[0].Value)
        }
    }
}

if (-not $tunnelUrl) {
    Write-Host "ERROR: Could not get tunnel URL after 60 seconds."
    exit 1
}

Write-Host "Tunnel URL: $tunnelUrl"

# 5. Update api-config.js with new tunnel URL
$configPath = "$MIRRA_DIR\api-config.js"
$config = Get-Content $configPath -Raw
$config = $config -replace "https://[a-z0-9\-]+\.trycloudflare\.com", $tunnelUrl
Set-Content $configPath $config
Write-Host "Updated api-config.js"

# 6. Git commit and push to GitHub
Set-Location $MIRRA_DIR
git add api-config.js
git commit -m "Auto-update tunnel URL on startup: $tunnelUrl"
git push origin gh-pages
Write-Host "Pushed to GitHub. Mira is live at https://onetwo346.github.io/mirra/"

# 7. Open admin dashboard in browser
Start-Sleep -Seconds 2
Start-Process "$MIRRA_DIR\admin.html"
Write-Host "Admin dashboard opened."
