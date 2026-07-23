# =====================================================================
#  Paula, Gafe y el misterio de la mansion encantada
#  Build de un clic: compila el juego web y genera el APK firmado.
#  Uso:  powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
# =====================================================================
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# --- 1. JDK (Android Studio trae uno; si tienes otro, ajusta aqui) ---
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
}
if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    throw "No encuentro un JDK. Instala Android Studio o define JAVA_HOME."
}
Write-Host "JDK: $env:JAVA_HOME" -ForegroundColor Cyan

# --- 2. Bundle web del juego -> android/app/src/main/assets ---
Write-Host "`n[1/3] Compilando el juego web (vite)..." -ForegroundColor Green
Push-Location $root
npm run build:apk-web
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Fallo el build web" }
Pop-Location

# --- 3. APK firmado con Gradle wrapper ---
Write-Host "`n[2/3] Compilando el APK (gradle)..." -ForegroundColor Green
Push-Location "$root\android"
& ".\gradlew.bat" assembleRelease --console=plain --warning-mode=none
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { throw "Fallo el build del APK" }

# --- 4. Copiar el APK a la raiz con nombre legible ---
Write-Host "`n[3/3] Copiando APK..." -ForegroundColor Green
$apk = "$root\android\app\build\outputs\apk\release\app-release.apk"
$dest = "$root\Paula-Gafe-Mansion-release.apk"
Copy-Item $apk $dest -Force
$size = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Host "`nLISTO -> $dest  ($size MB)" -ForegroundColor Yellow
