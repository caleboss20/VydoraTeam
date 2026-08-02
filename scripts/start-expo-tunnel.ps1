# Start Expo in tunnel mode — works when LAN is 10.x / AP-isolated (no usable 192.168).
# Usage: .\scripts\start-expo-tunnel.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Starting Expo in TUNNEL mode (works without 192.168 LAN)..."
Write-Host "Phone does not need same Wi-Fi for Metro. Scan the QR / use the exp:// URL Expo prints."
Write-Host ""

$busy = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
  $owner = $busy | Select-Object -First 1 -ExpandProperty OwningProcess
  Write-Host "Port 8081 in use (PID $owner) - stopping it..."
  Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

npx expo start --tunnel -c --port 8081
