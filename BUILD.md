# EmuNexa Build Guide

Complete guide to building, testing, signing, and distributing EmuNexa.

## 📋 Quick Start

### Prerequisites (Windows)
```powershell
# 1. Install Chocolatey (if not present)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Install build dependencies
choco install -y golang nodejs-lts nsis git wget

# 3. Install Wails
go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.1
# Add ~/go/bin to PATH if needed

# 4. Verify
go version        # 1.23+
node --version    # 20+
wails version     # v2.17.1+
makensis -VERSION # 3.09+
```

### One-Command Build
```powershell
# Full build with installer + portable + verification
.\build\build.ps1 -Configuration Release -CreateInstaller -Portable

# Quick dev build
wails dev
```

---

## 🏗️ Build Methods

### Method 1: Native Windows (Recommended)
```powershell
# Development
wails dev                          # Hot reload

# Production
wails build                        # Just executable
.\build\build.ps1 -CreateInstaller -Portable  # Full package
```

### Method 2: Docker (Windows Host)
```powershell
# Build using Windows container
docker build -t emunexa/build:1.0.0 --build-arg VERSION=1.0.0 .
docker run --rm -v ${PWD}/dist:/app/dist emunexa/build:1.0.0

# With docker-compose
docker compose build builder
docker compose run --rm builder
```

### Method 3: Cross-Compile from Linux/macOS
```bash
# Using docker-compose with Linux builder
docker compose -f docker-compose.yml -f docker-compose.linux.yml build linux-builder
docker compose -f docker-compose.yml -f docker-compose.linux.yml run --rm linux-builder

# Or direct Docker
docker buildx build --platform windows/amd64 -t emunexa/build:1.0.0 --load -f Dockerfile.build --target linux-cross-compile .
```

### Method 4: GitHub Actions (Automated)
Push a tag to trigger automated builds:
```bash
git tag v1.0.0
git push origin v1.0.0
```
Artifacts: `EmuNexa-Setup-1.0.0-windows-x64.exe`, `EmuNexa-Portable-1.0.0-windows-x64.zip`, checksums

---

## 📦 Output Artifacts

| Artifact | Description | Use Case |
|----------|-------------|----------|
| `build/EmuNexa.exe` | Standalone executable | Development, testing |
| `dist/EmuNexa-Setup-<ver>-windows-x64.exe` | NSIS installer | End-user distribution |
| `dist/EmuNexa-Portable-<ver>-windows-x64.zip` | Portable ZIP | USB, no-admin, testing |
| `dist/checksums.txt` | SHA256 checksums | Integrity verification |
| `dist/checksums.sha512` | SHA512 checksums | Stronger verification |

---

## 🔐 Code Signing

### Quick Test Certificate (Development)
```powershell
# Auto-generates self-signed cert and signs
.\build\sign.ps1 -GenerateTestCert

# Verify
.\build\sign.ps1 -VerifyOnly
```

### Production Signing (with real certificate)

**Option A: Certificate in Windows Store**
```powershell
# Find your cert thumbprint
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert

# Sign with store cert
.\build\sign.ps1 -CertificateThumbprint "ABC123..."
```

**Option B: PFX File**
```powershell
.\build\sign.ps1 -PfxPath "cert.pfx" -PfxPassword "secret"
```

**Option C: Azure Key Vault / AWS Signer**
```powershell
# Configure in GitHub Actions secrets:
# SIGN_TOOL_PATH, CERT_THUMBPRINT, or AZURE_KEY_VAULT_*
```

### GitHub Actions Signing Setup
1. Store secrets: `SIGN_TOOL_PATH`, `CERT_THUMBPRINT` (or PFX in base64)
2. Workflow auto-signs on release builds
3. Use `softprops/action-gh-release` for signed releases

---

## ✅ Verification

### Automated Verification
```powershell
# Full verification suite
.\build\verify.ps1

# Quick checks only
.\build\verify.ps1 -SkipInstallerTest -SkipPortableTest

# Output: dist/verification-report.json
```

### Manual Checks
```powershell
# Version
.\build\EmuNexa.exe --version

# Help
.\build\EmuNexa.exe --help

# Signature
Get-AuthenticodeSignature .\build\EmuNexa.exe | Format-List

# PE format
certutil -dump .\build\EmuNexa.exe | findstr "PE32"
```

### Verification Report
The script generates `dist/verification-report.json`:
```json
{
  "overall": "pass|pass_with_warnings|fail",
  "version": "1.0.0",
  "executable": { "found": true, "size_mb": 45.2, "runs": true, "signed": true },
  "installer": { "found": true, "install_works": true },
  "portable": { "found": true, "runs": true },
  "errors": [],
  "warnings": ["WebView2 not detected"]
}
```

---

## 🐳 Docker Deep Dive

### Build Stages
```dockerfile
# Dockerfile.build targets:
base-build       # All tools (Go, Node, NSIS, Wails)
frontend-build   # npm ci && npm run build
backend-build    # wails build
packager         # Creates .exe, .zip, .exe installer, checksums
runtime-test     # Minimal test environment
linux-cross-compile  # Cross-compile from Linux
```

### Multi-Arch Build
```bash
# Build for multiple platforms
docker buildx create --use --name emunexa-builder
docker buildx build \
  --platform windows/amd64,linux/amd64 \
  -t emunexa/build:1.0.0 \
  -f Dockerfile.build \
  --target packager \
  --push .
```

### Development Container
```bash
# Hot-reload dev environment
docker compose up dev
# Access: http://localhost:3000 (Vite) + Wails dev server
```

---

## 🚀 GitHub Actions CI/CD

### Workflow Triggers
| Event | Action |
|-------|--------|
| Push to main/develop | Lint, test, build (no release) |
| Tag `v*` | Full build + GitHub Release |
| PR | Lint, test, security scan |
| Manual | Custom version + optional release |

### Required Secrets (Repository Settings → Secrets)
| Secret | Required | Purpose |
|--------|----------|---------|
| `SIGN_TOOL_PATH` | Optional | Path to signtool.exe |
| `CERT_THUMBPRINT` | Optional | Code signing cert thumbprint |
| `PFX_BASE64` | Optional | Base64-encoded PFX |
| `PFX_PASSWORD` | Optional | PFX password |

### Release Artifacts
Automatically attached to GitHub Release:
- `EmuNexa-Setup-<ver>-windows-x64.exe`
- `EmuNexa-Portable-<ver>-windows-x64.zip`
- `checksums.txt` / `checksums.sha512`

---

## 🔧 Troubleshooting

### Common Build Errors

**"Wails not found"**
```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.1
$env:PATH += ";$env:HOME\go\bin"
```

**"CGO_ENABLED=1 required"**
```powershell
# Ensure GCC is available (via mingw-w64 on Linux, or TDM-GCC on Windows)
$env:CGO_ENABLED = "1"
```

**"NSIS not found"**
```powershell
choco install nsis
# Or: winget install NSIS
```

**"WebView2 runtime missing"**
- Install: https://go.microsoft.com/fwlink/p/?LinkId=2124703
- Usually pre-installed on Windows 11

**"Executable fails to start"**
```powershell
# Check dependencies
dumpbin /dependents build/EmuNexa.exe
# Run with debug
.\build\EmuNexa.exe --debug --log-level=debug
```

### Docker Issues

**"No space left on device"**
```bash
docker system prune -a --volumes
# Or increase Docker Desktop disk limit
```

**"Cross-compile fails"**
```bash
# Ensure mingw-w64 installed
apt-get install -y mingw-w64
# Use correct target
docker buildx build --platform windows/amd64 ...
```

### CI/CD Issues

**"Permission denied on upload-artifact"**
- Ensure `permissions: contents: write` in workflow

**"Release not created"**
- Tag must match `v*` pattern
- Or use `workflow_dispatch` with `create_release: true`

---

## 📊 Build Matrix

| Platform | Method | Status |
|----------|--------|--------|
| Windows x64 | Native | ✅ Primary |
| Windows x64 | Docker (Windows host) | ✅ |
| Windows x64 | Cross-compile (Linux) | ✅ |
| Windows ARM64 | Native | 🔄 Planned |
| Linux x64 | Cross-compile | 🔄 Planned |

---

## 📝 Versioning

### Semantic Versioning
```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```
Examples: `1.0.0`, `1.0.1`, `2.0.0-beta.1`, `1.0.0+git.abc123`

### Version Sources (priority)
1. Git tag (`v1.0.0`)
2. `github.event.inputs.version` (manual dispatch)
3. `git describe --tags`
4. Default: `0.0.0-dev.<short-sha>`

---

## 🛡️ Security

### Supply Chain
- Go modules: `go.sum` verified in CI
- npm: `package-lock.json` + `npm audit`
- Docker: Base images from Microsoft/Ubuntu official
- Artifacts: SHA256 + SHA512 checksums

### Scanning
- **Gosec**: Static analysis (Go)
- **Trivy**: Vulnerability scan (Docker/FS)
- **Dependency Review**: PR checks
- **CodeQL**: GitHub Advanced Security

---

## 📞 Support

| Issue | Channel |
|-------|---------|
| Build failures | GitHub Issues |
| CI/CD problems | GitHub Actions logs |
| Signing issues | `.\build\sign.ps1 -VerifyOnly` |
| Docker problems | `docker build --no-cache` |

---

**Last Updated**: 2025-11-19 | **EmuNexa Version**: 1.0.0