param(
    [string]$ToolsRoot = (Join-Path $env:USERPROFILE 'ptn-tools'),
    [string]$Architecture = 'arm64-v8a'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $env:JAVA_HOME) {
    $jdk = Get-ChildItem (Join-Path $ToolsRoot 'java') -Directory | Select-Object -First 1
    if (-not $jdk) { throw 'Set JAVA_HOME to a JDK 21 installation.' }
    $env:JAVA_HOME = $jdk.FullName
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $ToolsRoot 'sdk' }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_TOOL_OPTIONS = "$env:JAVA_TOOL_OPTIONS -Djava.net.preferIPv4Stack=true".Trim()
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$installedGradle = Join-Path $ToolsRoot 'gradle\gradle-9.4.1\bin\gradle.bat'
$gradle = if (Test-Path $installedGradle) { $installedGradle } else { Join-Path $projectRoot 'android\gradlew.bat' }
Push-Location (Join-Path $projectRoot 'android')
try {
    & $gradle :app:assembleOffline "-PreactNativeArchitectures=$Architecture" --max-workers=2 --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    $artifacts = Join-Path $projectRoot 'artifacts'
    New-Item -ItemType Directory -Path $artifacts -Force | Out-Null
    $destination = Join-Path $artifacts 'permis-tn-android-arm64.apk'
    if ($Architecture -ne 'arm64-v8a') { $destination = Join-Path $artifacts 'permis-tn-android.apk' }
    Copy-Item -LiteralPath 'app\build\outputs\apk\offline\app-offline.apk' -Destination $destination -Force
    Write-Output "APK: $destination"
} finally {
    Pop-Location
}
