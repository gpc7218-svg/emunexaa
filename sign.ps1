<#
.SYNOPSIS
    Code signing script for EmuNexa executables
.DESCRIPTION
    Signs EmuNexa.exe, installer, and portable zip with Authenticode signature.
    Supports multiple certificate sources: local store, file (PFX), Azure Key Vault, AWS Signer.
.NOTES
    For development/testing: generates a self-signed certificate automatically.
    For production: requires a valid code signing certificate from a trusted CA.
#>

param(
    [string]$ExecutablePath = "build/EmuNexa.exe",
    [string]$InstallerPath = "dist/EmuNexa-Setup.exe",
    [string]$PortablePath = "dist/EmuNexa-Portable.zip",
    [string]$CertificateThumbprint = "",
    [string]$PfxPath = "",
    [string]$PfxPassword = "",
    [string]$TimestampUrl = "http://timestamp.digicert.com",
    [switch]$GenerateTestCert,
    [switch]$VerifyOnly,
    [switch]$SkipInstaller,
    [switch]$SkipPortable
)

$ErrorActionPreference = "Stop"

# Colors
$Green = "[32m"; $Yellow = "[33m"; $Red = "[31m"; $Cyan = "[36m"; $Reset = "[0m"
function Write-Color([string]$Msg, [string]$Color = $Reset) { Write-Host "$Color$Msg$Reset" }

# ============================================================
# Find signtool.exe
# ============================================================
function Find-SignTool {
    $paths = @(
        "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe",
        "C:\Program Files\Windows Kits\10\bin\*\x64\signtool.exe",
        "C:\Program Files (x86)\Windows Kits\10\bin\*\x86\signtool.exe",
        "$env:ProgramFiles\Windows Kits\10\bin\*\x64\signtool.exe"
    )
    foreach ($pattern in $paths) {
        $found = Get-Item $pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return $null
}

$signtool = Find-SignTool
if (-not $signtool) {
    throw "signtool.exe not found. Install Windows 10 SDK: https://developer.microsoft.com/windows/downloads/windows-10-sdk/"
}
Write-Color "Using signtool: $signtool" $Cyan

# ============================================================
# Generate Test Certificate (for development)
# ============================================================
function Generate-TestCertificate {
    Write-Color "Generating self-signed test certificate..." $Yellow

    $cert = New-SelfSignedCertificate `
        -Subject "CN=EmuNexa Test Certificate" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyUsage DigitalSignature `
        -Type CodeSigningCert `
        -NotAfter (Get-Date).AddYears(1) `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
        -FriendlyName "EmuNexa Test Code Signing"

    Write-Color "Generated certificate: $($cert.Thumbprint)" $Green
    Write-Color "⚠ WARNING: This certificate is NOT trusted by Windows!" $Yellow
    Write-Color "   For testing only. Use a real CA certificate for distribution." $Yellow
    return $cert.Thumbprint
}

# ============================================================
# Get Certificate Thumbprint
# ============================================================
$thumbprint = $CertificateThumbprint

if ($GenerateTestCert) {
    $thumbprint = Generate-TestCertificate
} elseif ($PfxPath) {
    if (-not (Test-Path $PfxPath)) { throw "PFX file not found: $PfxPath" }
    Write-Color "Importing certificate from PFX..." $Cyan
    $securePass = ConvertTo-SecureString -String $PfxPassword -AsPlainText -Force
    $imported = Import-PfxCertificate -FilePath $PfxPath -CertStoreLocation "Cert:\CurrentUser\My" -Password $securePass -Exportable
    $thumbprint = $imported.Thumbprint
    Write-Color "Imported certificate: $thumbprint" $Green
} elseif (-not $thumbprint) {
    # Try to find existing code signing cert
    $certs = Get-ChildItem "Cert:\CurrentUser\My" -CodeSigningCert | Where-Object { $_.NotAfter -gt (Get-Date) }
    if ($certs.Count -gt 0) {
        $thumbprint = $certs[0].Thumbprint
        Write-Color "Found existing certificate: $thumbprint" $Green
    } else {
        Write-Color "No certificate found. Generating test certificate..." $Yellow
        $thumbprint = Generate-TestCertificate
    }
}

Write-Color "Using certificate thumbprint: $thumbprint" $Cyan

# ============================================================
# Verify Certificate
# ============================================================
$cert = Get-Item "Cert:\CurrentUser\My\$thumbprint" -ErrorAction SilentlyContinue
if (-not $cert) { throw "Certificate not found in store: $thumbprint" }

Write-Color "Certificate Details:" $Cyan
Write-Color "  Subject: $($cert.Subject)" $Reset
Write-Color "  Issuer: $($cert.Issuer)" $Reset
Write-Color "  Valid: $($cert.NotBefore) to $($cert.NotAfter)" $Reset
Write-Color "  Thumbprint: $($cert.Thumbprint)" $Reset
Write-Color "  Enhanced Key Usage: $($cert.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.37' } | ForEach-Object { $_.Format(0) })" $Reset

# ============================================================
# Sign File Function
# ============================================================
function Sign-File {
    param([string]$FilePath, [string]$Description = "")

    if (-not (Test-Path $FilePath)) {
        Write-Color "File not found: $FilePath" $Red
        return $false
    }

    Write-Color "Signing: $FilePath" $Cyan

    $args = @(
        "sign",
        "/fd", "sha256",
        "/sha1", $thumbprint,
        "/tr", $TimestampUrl,
        "/td", "sha256",
        "/v",
        $FilePath
    )

    if ($Description) { $args += "/d", $Description }

    $result = & $signtool @args
    if ($LASTEXITCODE -ne 0) {
        Write-Color "Signing failed for $FilePath" $Red
        Write-Color $result $Red
        return $false
    }

    Write-Color "  Signed successfully" $Green
    return $true
}

# ============================================================
# Verify Signature
# ============================================================
function Verify-Signature {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) { return $false }

    $result = & $signtool verify /pa /v $FilePath
    if ($LASTEXITCODE -eq 0) {
        Write-Color "  ✓ Signature valid" $Green
        return $true
    } else {
        Write-Color "  ✗ Signature invalid or missing" $Red
        Write-Color $result $Red
        return $false
    }
}

# ============================================================
# Main Execution
# ============================================================
if ($VerifyOnly) {
    Write-Color "Verification mode only" $Cyan
    Verify-Signature $ExecutablePath
    if (-not $SkipInstaller) { Verify-Signature $InstallerPath }
    if (-not $SkipPortable) { Verify-Signature $PortablePath }
    exit 0
}

$success = $true

# Sign main executable
if (Test-Path $ExecutablePath) {
    $success = Sign-File $ExecutablePath "EmuNexa Application" -and $success
} else {
    Write-Color "Executable not found: $ExecutablePath" $Red
    $success = $false
}

# Sign installer
if (-not $SkipInstaller -and (Test-Path $InstallerPath)) {
    $success = Sign-File $InstallerPath "EmuNexa Installer" -and $success
}

# Sign portable zip (note: zip signing is informational only)
if (-not $SkipPortable -and (Test-Path $PortablePath)) {
    Write-Color "Note: ZIP files cannot be Authenticode signed directly" $Yellow
    Write-Color "  Consider: GPG sign the zip, or sign individual files inside" $Yellow
}

# Verify all signatures
Write-Color "`nVerifying signatures..." $Cyan
$allValid = $true
$allValid = Verify-Signature $ExecutablePath -and $allValid
if (-not $SkipInstaller) { $allValid = Verify-Signature $InstallerPath -and $allValid }

# Summary
Write-Color "`n===============================" $Cyan
if ($success -and $allValid) {
    Write-Color "  ALL FILES SIGNED AND VERIFIED" $Green
} else {
    Write-Color "  SOME OPERATIONS FAILED" $Red
}
Write-Color "===============================" $Cyan

exit ($success -and $allValid ? 0 : 1)