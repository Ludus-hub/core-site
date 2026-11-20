# ============================================================
# download-assets.ps1
# Run this from your project root in PowerShell
# ============================================================

$htmlDest   = ".\Versions\Assets\Games\html"
$coversDest = ".\Versions\Assets\Games\covers"

Write-Host "Creating directories..."
New-Item -ItemType Directory -Force -Path $htmlDest   | Out-Null
New-Item -ItemType Directory -Force -Path $coversDest | Out-Null

Write-Host "Cloning html repo..."
git clone --depth=1 https://github.com/freebuisness/html $htmlDest

Write-Host "Cloning covers repo..."
git clone --depth=1 https://github.com/freebuisness/covers $coversDest

Write-Host ""
Write-Host "Done! Now run: node patch-paths.js"
