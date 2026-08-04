# Start Expo on LAN so Expo Go on your phone can load the bundle (not 127.0.0.1).
# Prefer: npm start  (runs scripts/expo-start.js — avoids TypeError: fetch failed)
# This .ps1 remains as a thin wrapper for older muscle memory.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
node ./scripts/expo-start.js
