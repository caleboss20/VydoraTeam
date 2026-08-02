# Start Expo on LAN so Expo Go on your phone can load the bundle (not 127.0.0.1).
# Also rewrites .env.local API URLs to the current Wi-Fi IP.
# Usage: .\scripts\start-expo-lan.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$lan = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.PrefixOrigin -ne 'WellKnown' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.IPAddress -notlike '192.168.56.*' -and
    $_.IPAddress -notlike '172.*'
  } | Sort-Object { if ($_.InterfaceAlias -like '*Wi-Fi*') { 0 } else { 1 } } |
  Select-Object -First 1 -ExpandProperty IPAddress)

if ($lan) {
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $lan
  Write-Host "LAN IP: $lan"
  Write-Host "Metro URL should be exp://${lan}:8081 (not 127.0.0.1)"

  $api = "http://${lan}:8080/api/v1"
  $ws = "http://${lan}:8080/ws"
  $envBody = @"
# Phone / Expo Go cannot use localhost — point at your PC Wi-Fi LAN IP.
# Auto-updated by scripts/start-expo-lan.ps1

EXPO_PUBLIC_API_PREFER=local
EXPO_PUBLIC_API_BASE_LOCAL=$api
EXPO_PUBLIC_WS_BASE_LOCAL=$ws
EXPO_PUBLIC_API_BASE=$api
EXPO_PUBLIC_WS_BASE=$ws
"@
  Set-Content -Path ".env.local" -Value $envBody -Encoding UTF8
  Write-Host "Updated .env.local -> $api"
  Write-Host ""
} else {
  Write-Host "Could not detect LAN IP — run ipconfig and update .env.local manually."
}

Write-Host "Starting Expo (LAN mode, clear cache)..."
$busy = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
  $owner = $busy | Select-Object -First 1 -ExpandProperty OwningProcess
  Write-Host "Port 8081 in use (PID $owner) — stopping it..."
  Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}
npx expo start --lan -c --port 8081
