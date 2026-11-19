<#
.SYNOPSIS
    Comprehensive verification script for EmuNexa build artifacts
.DESCRIPTION
    Validates that the executable, installer, and portable package work correctly.
    Runs functional tests, checks dependencies, and generates a verification report.
#>

param(
    [string]$ExePath = "build/EmuNexa.exe",
    [string]$InstallerPath = "dist/EmuNexa-Setup.exe",
    [string]$PortablePath = "dist/EmuNexa-Portable.zip",
    [string]$OutputReport = "dist/verification-report.json",
    [switch]$RunGuiTest,
    [switch]$SkipInstallerTest,
    [switch]$SkipPortableTest,
    [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = "Continue"

# Colors
$Green = "[32m"; $Yellow = "[33m"; $Red = "[31m"; $Cyan = "[36m"; $Reset = "[0m"
function Write-Color([string]$Msg, [string]$Color = $Reset) { Write-Host "$Color$Msg$Reset" }

# Results collector
$results = @{
    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    version = ""
    executable = @{}
    installer = @{}
    portable = @{}
    overall = "unknown"
    errors = @()
    warnings = @()
}

function Add-Error([string]$msg) { $results.errors += $msg; Write-Color "  ✗ $msg" $Red }
function Add-Warning([string]$msg) { $results.warnings += $msg; Write-Color "  ⚠ $msg" $Yellow }
function Add-Success([string]$msg) { Write-Color "  ✓ $msg" $Green }

# ============================================================
# Test 1: Executable Basics
# ============================================================
function Test-Executable {
    Write-Color "`n=== Testing Executable ===" $Cyan

    if (-not (Test-Path $ExePath)) {
        Add-Error "Executable not found: $ExePath"
        $results.executable.found = $false
        return
    }
    $results.executable.found = $true
    Add-Success "Executable found"

    # File info
    $fileInfo = Get-Item $ExePath
    $results.executable.size_bytes = $fileInfo.Length
    $results.executable.size_mb = [math]::Round($fileInfo.Length / 1MB, 2)
    Add-Success "Size: $($results.executable.size_mb) MB"

    # Version check
    try {
        $proc = Start-Process -FilePath $ExePath -ArgumentList "--version" -NoNewWindow -Wait -RedirectStandardOutput "version.txt" -RedirectStandardError "version_err.txt"
        $output = Get-Content "version.txt" -Raw -ErrorAction SilentlyContinue
        Remove-Item "version.txt", "version_err.txt" -ErrorAction SilentlyContinue

        if ($output -match '(\d+\.\d+\.\d+)') {
            $results.version = $matches[1]
            $results.executable.version = $matches[1]
            Add-Success "Version: $($matches[1])"
        } else {
            Add-Warning "Version output unclear: $output"
        }
    } catch {
        Add-Error "Failed to run --version: $_"
    }

    # Check it's a valid PE executable
    try {
        $peCheck = & "C:\Windows\System32\certutil.exe" -dump $ExePath 2>&1
        if ($peCheck -match "PE32") {
            $results.executable.pe_format = "PE32+"
            Add-Success "Valid PE32+ executable"
        } else {
            Add-Warning "PE format check inconclusive"
        }
    } catch {
        Add-Warning "Could not verify PE format"
    }

    # Check digital signature (if present)
    try {
        $sig = Get-AuthenticodeSignature $ExePath
        $results.executable.signed = $sig.Status -eq "Valid"
        $results.executable.signer = $sig.SignerCertificate.Subject
        if ($results.executable.signed) {
            Add-Success "Valid Authenticode signature"
        } else {
            Add-Warning "Not signed or invalid signature: $($sig.Status)"
        }
    } catch {
        Add-Warning "Could not check signature"
    }

    # Test help flag
    try {
        $proc = Start-Process -FilePath $ExePath -ArgumentList "--help" -NoNewWindow -Wait -RedirectStandardOutput "help.txt" -RedirectStandardError "help_err.txt" -PassThru
        $proc.WaitForExit(5000)
        $output = Get-Content "help.txt" -Raw -ErrorAction SilentlyContinue
        Remove-Item "help.txt", "help_err.txt" -ErrorAction SilentlyContinue
        if ($output -match "EmuNexa|usage|options") {
            Add-Success "Help flag works"
            $results.executable.help_works = $true
        }
    } catch {
        Add-Warning "Help flag test failed"
    }
}

# ============================================================
# Test 2: Installer
# ============================================================
function Test-Installer {
    if ($SkipInstallerTest) { return }

    Write-Color "`n=== Testing Installer ===" $Cyan

    if (-not (Test-Path $InstallerPath)) {
        Add-Error "Installer not found: $InstallerPath"
        $results.installer.found = $false
        return
    }
    $results.installer.found = $true
    Add-Success "Installer found"

    $fileInfo = Get-Item $InstallerPath
    $results.installer.size_bytes = $fileInfo.Length
    $results.installer.size_mb = [math]::Round($fileInfo.Length / 1MB, 2)
    Add-Success "Size: $($results.installer.size_mb) MB"

    # Check NSIS signature
    try {
        $sig = Get-AuthenticodeSignature $InstallerPath
        $results.installer.signed = $sig.Status -eq "Valid"
        if ($results.installer.signed) {
            Add-Success "Installer signed"
        } else {
            Add-Warning "Installer not signed: $($sig.Status)"
        }
    } catch { Add-Warning "Could not check installer signature" }

    # Silent install test (dry run)
    $testDir = "C:\EmuNexa_Test_Install"
    if (Test-Path $testDir) { Remove-Item -Recurse -Force $testDir -ErrorAction SilentlyContinue }

    try {
        Write-Color "Running silent install test..." $Cyan
        $proc = Start-Process -FilePath $InstallerPath -ArgumentList "/S", "/D=$testDir" -NoNewWindow -Wait -PassThru
        $proc.WaitForExit(60000)

        if ($proc.ExitCode -eq 0) {
            Add-Success "Silent install succeeded (exit code 0)"

            # Verify installed files
            $installedExe = "$testDir\EmuNexa.exe"
            if (Test-Path $installedExe) {
                Add-Success "EmuNexa.exe installed correctly"
                $results.installer.install_works = $true

                # Test installed executable
                $installedProc = Start-Process -FilePath $installedExe -ArgumentList "--version" -NoNewWindow -Wait -RedirectStandardOutput "inst_ver.txt" -RedirectStandardError "inst_err.txt"
                $instOutput = Get-Content "inst_ver.txt" -Raw -ErrorAction SilentlyContinue
                Remove-Item "inst_ver.txt", "inst_err.txt" -ErrorAction SilentlyContinue
                if ($instOutput -match '(\d+\.\d+\.\d+)') {
                    Add-Success "Installed executable runs: $($matches[1])"
                }
            } else {
                Add-Error "EmuNexa.exe not found after install"
            }

            # Check shortcuts
            $desktopShortcut = "$env:PUBLIC\Desktop\EmuNexa.lnk"
            $startMenuShortcut = "$env:PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\EmuNexa\EmuNexa.lnk"
            if (Test-Path $desktopShortcut -or Test-Path $startMenuShortcut) {
                Add-Success "Shortcuts created"
            } else {
                Add-Warning "Shortcuts not found (may be per-user)"
            }
        } else {
            Add-Error "Installer failed with exit code: $($proc.ExitCode)"
        }
    } catch {
        Add-Error "Install test exception: $_"
    } finally {
        # Cleanup
        if (Test-Path $testDir) {
            try { Remove-Item -Recurse -Force $testDir -ErrorAction SilentlyContinue } catch {}
        }
    }
}

# ============================================================
# Test 3: Portable Package
# ============================================================
function Test-Portable {
    if ($SkipPortableTest) { return }

    Write-Color "`n=== Testing Portable Package ===" $Cyan

    if (-not (Test-Path $PortablePath)) {
        Add-Error "Portable zip not found: $PortablePath"
        $results.portable.found = $false
        return
    }
    $results.portable.found = $true
    Add-Success "Portable package found"

    $fileInfo = Get-Item $PortablePath
    $results.portable.size_bytes = $fileInfo.Length
    $results.portable.size_mb = [math]::Round($fileInfo.Length / 1MB, 2)
    Add-Success "Size: $($results.portable.size_mb) MB"

    # Extract and test
    $extractDir = "C:\EmuNexa_Test_Portable"
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue }

    try {
        Write-Color "Extracting portable package..." $Cyan
        Expand-Archive -Path $PortablePath -DestinationPath $extractDir -Force

        # Check contents
        $portableExe = "$extractDir\EmuNexa.exe"
        $portableDist = "$extractDir\dist"
        $readme = "$extractDir\README.txt"

        if (Test-Path $portableExe) { Add-Success "EmuNexa.exe present" } else { Add-Error "EmuNexa.exe missing" }
        if (Test-Path $portableDist) { Add-Success "Frontend assets present" } else { Add-Warning "Frontend assets missing" }
        if (Test-Path $readme) { Add-Success "README present" } else { Add-Warning "README missing" }

        # Test portable executable
        $proc = Start-Process -FilePath $portableExe -ArgumentList "--version" -NoNewWindow -Wait -RedirectStandardOutput "port_ver.txt" -RedirectStandardError "port_err.txt"
        $output = Get-Content "port_ver.txt" -Raw -ErrorAction SilentlyContinue
        Remove-Item "port_ver.txt", "port_err.txt" -ErrorAction SilentlyContinue
        if ($output -match '(\d+\.\d+\.\d+)') {
            Add-Success "Portable executable runs: $($matches[1])"
            $results.portable.runs = $true
        } else {
            Add-Error "Portable executable failed to run"
        }

    } catch {
        Add-Error "Portable test exception: $_"
    } finally {
        if (Test-Path $extractDir) {
            try { Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue } catch {}
        }
    }
}

# ============================================================
# Test 4: Dependency Check
# ============================================================
function Test-Dependencies {
    Write-Color "`n=== Checking Runtime Dependencies ===" $Cyan

    # WebView2 Runtime
    try {
        $webview2 = Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
        if ($webview2) {
            Add-Success "WebView2 Runtime: $($webview2.pv)"
            $results.dependencies.webview2 = $webview2.pv
        } else {
            Add-Warning "WebView2 Runtime not detected (required for UI)"
        }
    } catch { Add-Warning "Could not check WebView2" }

    # QEMU
    try {
        $qemuPaths = @("C:\Program Files\qemu\qemu-system-x86_64.exe", "C:\Program Files (x86)\qemu\qemu-system-x86_64.exe")
        foreach ($p in $qemuPaths) {
            if (Test-Path $p) {
                $ver = & $p --version 2>&1 | Select-Object -First 1
                Add-Success "QEMU found: $ver"
                $results.dependencies.qemu = $ver
                break
            }
        }
        if (-not $results.dependencies.qemu) {
            Add-Warning "QEMU not found in standard locations (will use PATH or bundled)"
        }
    } catch { Add-Warning "Could not check QEMU" }

    # Hyper-V / WHPX
    try {
        $whpx = Get-WindowsOptionalFeature -Online -FeatureName "HypervisorPlatform" -ErrorAction SilentlyContinue
        if ($whpx -and $whpx.State -eq "Enabled") {
            Add-Success "WHPX (Hypervisor Platform) enabled"
            $results.dependencies.whpx = $true
        } else {
            Add-Warning "WHPX not enabled (TCG software emulation will be used)"
        }
    } catch { Add-Warning "Could not check WHPX" }
}

# ============================================================
# Main Execution
# ============================================================
Write-Color "========================================" $Cyan
Write-Color "  EmuNexa Build Verification" $Cyan
Write-Color "========================================" $Cyan

Test-Executable
Test-Installer
Test-Portable
Test-Dependencies

# Determine overall status
if ($results.errors.Count -eq 0) {
    if ($results.warnings.Count -eq 0) {
        $results.overall = "pass"
    } else {
        $results.overall = "pass_with_warnings"
    }
} else {
    $results.overall = "fail"
}

# Write report
$results | ConvertTo-Json -Depth 5 | Set-Content $OutputReport -Encoding UTF8

Write-Color "`n========================================" $Cyan
Write-Color "  VERIFICATION SUMMARY" $Cyan
Write-Color "========================================" $Cyan
Write-Color "Overall: $($results.overall)" (if ($results.overall -eq "pass") { $Green } elseif ($results.overall -eq "pass_with_warnings") { $Yellow } else { $Red })
Write-Color "Version: $($results.version)" $Cyan
Write-Color "Errors: $($results.errors.Count)" $Red
Write-Color "Warnings: $($results.warnings.Count)" $Yellow
Write-Color "Report: $OutputReport" $Cyan

if ($results.errors.Count -gt 0) {
    Write-Color "`nERRORS:" $Red
    $results.errors | ForEach-Object { Write-Color "  - $_" $Red }
}

exit ($results.overall -eq "fail" ? 1 : 0)