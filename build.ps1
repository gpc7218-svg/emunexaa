<#
.SYNOPSIS
    Build script for EmuNexa Windows application
.DESCRIPTION
    This script builds the EmuNexa application for Windows using Wails v2
.NOTES
    Requires: Go 1.23+, Node.js 20+, Wails v2.17.1+
#>

param(
    [string]$Configuration = "Release",
    [string]$OutputDir = "dist",
    [switch]$Clean,
    [switch]$Sign,
    [string]$SignToolPath,
    [string]$CertificateThumbprint,
    [switch]$CreateInstaller,
    [switch]$Portable
)

$ErrorActionPreference = "Stop"

# Colors for output
$Green = "[32m"
$Yellow = "[33m"
$Red = "[31m"
$Cyan = "[36m"
$Reset = "[0m"

function Write-Color([string]$Message, [string]$Color = $Reset) {
    Write-Host "$Color$Message$Reset"
}

function Check-Prerequisites {
    Write-Color "Checking prerequisites..." $Cyan

    # Check Go
    $goVersion = & go version 2>$null
    if (-not $goVersion) {
        throw "Go is not installed or not in PATH"
    }
    Write-Color "  Go: $goVersion" $Green

    # Check Node.js
    $nodeVersion = & node --version 2>$null
    if (-not $nodeVersion) {
        throw "Node.js is not installed or not in PATH"
    }
    Write-Color "  Node.js: $nodeVersion" $Green

    # Check npm
    $npmVersion = & npm --version 2>$null
    if (-not $npmVersion) {
        throw "npm is not installed or not in PATH"
    }
    Write-Color "  npm: $npmVersion" $Green

    # Check Wails
    $wailsVersion = & wails version 2>$null
    if (-not $wailsVersion) {
        Write-Color "  Wails: Not found, installing..." $Yellow
        & go install github.com/wailsapp/wails/v2/cmd/wails@latest
        $env:PATH += ";$env:HOME\go\bin"
        $wailsVersion = & wails version 2>$null
        if (-not $wailsVersion) {
            throw "Failed to install Wails"
        }
    }
    Write-Color "  Wails: $wailsVersion" $Green

    # Check NSIS (for installer)
    if ($CreateInstaller) {
        $nsisPath = "${env:ProgramFiles}\NSIS\makensis.exe"
        if (-not (Test-Path $nsisPath)) {
            $nsisPath = "${env:ProgramFiles(x86)}\NSIS\makensis.exe"
        }
        if (-not (Test-Path $nsisPath)) {
            throw "NSIS not found. Install NSIS from https://nsis.sourceforge.io/"
        }
        Write-Color "  NSIS: Found at $nsisPath" $Green
    }
}

function Clean-Build {
    Write-Color "Cleaning previous builds..." $Cyan
    $dirs = @("build", "dist", "frontend/dist", "frontend/node_modules")
    foreach ($dir in $dirs) {
        if (Test-Path $dir) {
            Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
            Write-Color "  Removed: $dir" $Green
        }
    }
}

function Install-FrontendDependencies {
    Write-Color "Installing frontend dependencies..." $Cyan
    Push-Location "frontend"
    try {
        & npm ci
    } finally {
        Pop-Location
    }
    Write-Color "  Frontend dependencies installed" $Green
}

function Build-Frontend {
    Write-Color "Building frontend..." $Cyan
    Push-Location "frontend"
    try {
        & npm run build
    } finally {
        Pop-Location
    }
    Write-Color "  Frontend built" $Green
}

function Build-Backend {
    Write-Color "Building backend..." $Cyan

    $ldflags = @(
        "-s -w",
        "-X github.com/emunexa/emunexa/cmd/emu-nexa.Version=$env:APP_VERSION",
        "-X github.com/emunexa/emunexa/cmd/emu-nexa.Commit=$env:GIT_COMMIT",
        "-X github.com/emunexa/emunexa/cmd/emu-nexa.BuildDate=$(Get-Date -Format 'yyyy-MM-dd')"
    ) -join " "

    $tags = @()
    if ($Configuration -eq "Release") {
        $tags += "production"
    }

    $args = @(
        "build",
        "-ldflags", $ldflags,
        "-o", "../build/EmuNexa.exe"
    )
    if ($tags.Count -gt 0) {
        $args += "-tags", ($tags -join ",")
    }

    & wails $args

    Write-Color "  Backend built" $Green
}

function Create-Portable {
    Write-Color "Creating portable package..." $Cyan

    $portableDir = "dist/portable"
    if (Test-Path $portableDir) {
        Remove-Item -Recurse -Force $portableDir
    }
    New-Item -ItemType Directory -Path $portableDir | Out-Null

    # Copy executable
    Copy-Item "build/EmuNexa.exe" "$portableDir/" -Force

    # Copy frontend assets
    if (Test-Path "frontend/dist") {
        Copy-Item "frontend/dist" "$portableDir/" -Recurse -Force
    }

    # Create README
    @"
EmuNexa Portable Edition
========================

This is a portable version of EmuNexa. No installation required.

Requirements:
- Windows 10 2004+ or Windows 11
- WebView2 Runtime (usually pre-installed)
- QEMU with WHPX support (for hardware acceleration)

To run: Double-click EmuNexa.exe

For more information, visit: https://github.com/emunexa/emunexa
"@ | Set-Content "$portableDir/README.txt" -Encoding UTF8

    # Create ZIP
    Compress-Archive -Path "$portableDir/*" -DestinationPath "dist/EmuNexa-Portable.zip" -Force
    Write-Color "  Portable package created: dist/EmuNexa-Portable.zip" $Green
}

function Create-Installer {
    Write-Color "Creating NSIS installer..." $Cyan

    $nsisScript = @"
!include "MUI2.nsh"

Name "EmuNexa"
OutFile "dist/EmuNexa-Setup.exe"
InstallDir "\$PROGRAMFILES\EmuNexa"
InstallDirRegKey HKCU "Software\EmuNexa" ""
RequestExecutionLevel admin

!define MUI_ICON "build/icon.ico"
!define MUI_UNICON "build/icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

Section "MainSection" SEC01
    SetOutPath "\$INSTDIR"
    File /r "build\EmuNexa.exe"
    File /r "frontend\dist\*"

    WriteRegStr HKCU "Software\EmuNexa" "" "\$INSTDIR"
    WriteUninstaller "\$INSTDIR\Uninstall.exe"

    CreateDirectory "\$SMPROGRAMS\EmuNexa"
    CreateShortCut "\$SMPROGRAMS\EmuNexa\EmuNexa.lnk" "\$INSTDIR\EmuNexa.exe"
    CreateShortCut "\$DESKTOP\EmuNexa.lnk" "\$INSTDIR\EmuNexa.exe"
SectionEnd

Section "Uninstall"
    Delete "\$INSTDIR\EmuNexa.exe"
    RMDir /r "\$INSTDIR"
    Delete "\$SMPROGRAMS\EmuNexa\EmuNexa.lnk"
    Delete "\$DESKTOP\EmuNexa.lnk"
    RMDir "\$SMPROGRAMS\EmuNexa"
    DeleteRegKey HKCU "Software\EmuNexa"
SectionEnd
"@

    $nsisPath = "${env:ProgramFiles}\NSIS\makensis.exe"
    if (-not (Test-Path $nsisPath)) {
        $nsisPath = "${env:ProgramFiles(x86)}\NSIS\makensis.exe"
    }

    $scriptPath = "build/installer.nsi"
    $nsisScript | Set-Content $scriptPath -Encoding UTF8

    & $nsisPath $scriptPath
    Write-Color "  Installer created: dist/EmuNexa-Setup.exe" $Green
}

function Sign-Executable {
    if (-not $Sign) { return }

    Write-Color "Signing executable..." $Cyan

    if (-not $SignToolPath) {
        $SignToolPath = "signtool.exe"
    }

    if (-not $CertificateThumbprint) {
        throw "Certificate thumbprint required for signing"
    }

    & $SignToolPath sign /fd sha256 /sha1 $CertificateThumbprint /tr http://timestamp.digicert.com /td sha256 "build/EmuNexa.exe"
    Write-Color "  Executable signed" $Green
}

# Main execution
try {
    Write-Color "========================================" $Cyan
    Write-Color "  EmuNexa Build Script" $Cyan
    Write-Color "========================================" $Cyan
    Write-Host ""

    # Set version from git or default
    $gitVersion = & git describe --tags --always --dirty 2>$null
    if ($gitVersion) {
        $env:APP_VERSION = $gitVersion.TrimStart('v')
    } else {
        $env:APP_VERSION = "1.0.0"
    }
    $env:GIT_COMMIT = (& git rev-parse --short HEAD 2>$null) ?? "unknown"

    Write-Color "Version: $env:APP_VERSION" $Green
    Write-Color "Commit: $env:GIT_COMMIT" $Green
    Write-Color "Configuration: $Configuration" $Green
    Write-Host ""

    Check-Prerequisites

    if ($Clean) {
        Clean-Build
    }

    # Create build directory
    if (-not (Test-Path "build")) {
        New-Item -ItemType Directory -Path "build" | Out-Null
    }
    if (-not (Test-Path "dist")) {
        New-Item -ItemType Directory -Path "dist" | Out-Null
    }

    Install-FrontendDependencies
    Build-Frontend
    Build-Backend
    Sign-Executable

    if ($Portable) {
        Create-Portable
    }

    if ($CreateInstaller) {
        Create-Installer
    }

    Write-Host ""
    Write-Color "========================================" $Cyan
    Write-Color "  Build completed successfully!" $Green
    Write-Color "========================================" $Cyan
    Write-Host ""
    Write-Color "Output:" $Cyan
    Write-Color "  Executable: build/EmuNexa.exe" $Green
    if ($Portable) {
        Write-Color "  Portable: dist/EmuNexa-Portable.zip" $Green
    }
    if ($CreateInstaller) {
        Write-Color "  Installer: dist/EmuNexa-Setup.exe" $Green
    }
}
catch {
    Write-Color "Build failed: $_" $Red
    exit 1
}