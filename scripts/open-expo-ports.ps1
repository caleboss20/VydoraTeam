# Open Windows Firewall for Expo Metro (8081) + Vydora API (8080).
# Safe to re-run. Prefer "Run as Administrator" once if rules fail to create.

$ErrorActionPreference = "SilentlyContinue"

function Ensure-AllowPort([int]$Port, [string]$Name) {
  $existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Firewall OK: $Name"
    return
  }
  try {
    New-NetFirewallRule -DisplayName $Name -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any -Enabled True | Out-Null
    Write-Host "Firewall added: $Name (TCP $Port)"
  } catch {
    Write-Host "Firewall SKIPPED for $Name (run PowerShell as Admin once): $($_.Exception.Message)"
  }
}

Ensure-AllowPort 8080 "Vydora Backend 8080"
Ensure-AllowPort 8081 "Vydora Expo Metro 8081"

# Java inbound Block rules can stop the phone from reaching Spring Boot
Get-NetFirewallRule -DisplayName "java.exe" -ErrorAction SilentlyContinue |
  Where-Object { $_.Direction -eq "Inbound" -and $_.Action -eq "Block" -and $_.Enabled } |
  ForEach-Object {
    try {
      Disable-NetFirewallRule -Name $_.Name
      Write-Host "Disabled blocking java inbound rule: $($_.Name)"
    } catch {
      Write-Host "Could not disable java block rule (need Admin): $($_.Name)"
    }
  }
