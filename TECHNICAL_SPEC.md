# EmuNexa Technical Specification

## 1. Project Overview

**Application Name:** EmuNexa  
**Platform:** Windows 10/11 (64-bit)  
**Primary Executable:** EmuNexa.exe  
**Architecture:** Modular, maintainable, extensible  

## 2. Technology Stack Decisions

### Backend (Application Orchestration)
- **Language:** Go 1.23+
- **Framework:** Wails v2.17.1 (Go + WebView2)
- **Responsibilities:**
  - Windows integration, system calls
  - Process management (QEMU lifecycle)
  - Configuration persistence (JSON/TOML)
  - Hardware detection & virtualization capability probing
  - Dependency management (QEMU downloads, verification)
  - IPC with frontend via Wails bindings
  - Security: safe subprocess execution, path validation

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Custom Design System
- **State Management:** Zustand + React Query
- **Internationalization:** i18next (EN/AR with RTL support)
- **Responsibilities:**
  - Dashboard, Device Wizard, Device Manager, Live Window, Settings, Diagnostics
  - Real-time VM metrics display
  - User interaction, settings persistence

### Virtualization Backend (Modular, Swappable)
- **Primary Engine:** QEMU 11.x (Windows builds from qemu.org)
- **Acceleration:** WHPX (Windows Hypervisor Platform)
  - x86_64: Windows 10 2004+ with HypervisorPlatform enabled
  - arm64: Windows 11 24H2 + April/May 2025 updates
- **Graphics:** virtio-gpu-pci + SDL display (gl=on) for Linux/Android guests
- **Storage:** virtio-blk + qcow2/raw
- **Network:** virtio-net + user-mode networking with ADB port forward
- **Abstraction Layer:** Clean interface for future engines (Hyper-V, WHV, etc.)

### Build & Distribution
- **Build System:** Go build + Wails build + Vite
- **Packaging:** NSIS installer + Portable ZIP
- **Code Signing:** Required for distribution
- **Auto-update:** Built-in update checker (GitHub releases)

## 3. Architecture Diagram

```
+-----------------------------------------------------------------+
|                      EmuNexa.exe (Wails App)                    |
+-----------------------------------------------------------------+
|  Frontend (React/TS)          |  Backend (Go)                   |
|  -------------------------    |  ---------------                |
|  * Dashboard                  |  * App Lifecycle                |
|  * Device Wizard              |  * Config Management            |
|  * Device Manager             |  * Hardware Detection           |
|  * Live Window                |  * Virtualization Engine        |
|  * Settings                   |     +- QEMU Adapter             |
|  * Diagnostics                |     +- (Future: Hyper-V)        |
|  * AI Assistant (optional)    |  * Image Manager                |
|                               |  * Device Profile Manager       |
|                               |  * Download Manager             |
|                               |  * Diagnostics Engine           |
|                               |  * Security Layer               |
+-----------------------------------------------------------------+
|                    Wails IPC Bridge                             |
+-----------------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------------+
|                     QEMU Process Tree                           |
|  qemu-system-x86_64/aarch64 -accel whpx ...                     |
|  +- virtio-gpu-pci (display)                                    |
|  +- virtio-blk (storage)                                        |
|  +- virtio-net (network)                                        |
|  +- virtio-serial (guest agent, optional)                       |
+-----------------------------------------------------------------+
```

## 4. Core Modules (Go Backend)

### 4.1 Hardware Detection (`internal/hardware`)
- CPU model, cores, threads, features (AVX, SSE, etc.)
- RAM total/available
- GPU vendor, model, VRAM, driver version
- Windows version, build
- Virtualization support: WHPX, Hyper-V, VMX/SVM
- Storage: available space, type (SSD/HDD)

### 4.2 Virtualization Engine (`internal/virtualization`)
- **QEMUAdapter:** QEMU binary management, argument building, process control
- **AccelerationDetector:** WHPX availability, Hyper-V conflicts
- **VMController:** Start, stop, restart, pause, resume, monitor
- **GraphicsConfig:** Display device selection, renderer, scaling
- **NetworkConfig:** User-mode, port forwarding, DNS
- **StorageConfig:** Disk creation, resizing, snapshots

### 4.3 Image Management (`internal/image`)
- **Inspector:** Format detection, architecture, partitions, bootability
- **Classifier:** Compatibility tiers (Full/Config/Experimental/Incompatible)
- **Converter:** RAW <-> QCOW2, ISO extraction, safe working copies
- **Downloader:** Official image sources (with verification)

### 4.4 Device Management (`internal/device`)
- **Profile:** CPU, RAM, storage, display, graphics, audio, network, advanced
- **Presets:** Low-End, Balanced, Performance, Manual
- **CRUD:** Create, read, update, delete, clone
- **Validation:** Pre-flight checks before VM start

### 4.5 Configuration (`internal/config`)
- **Settings:** Structured config with validation
- **Persistence:** JSON file with migration support
- **Schema:** Versioned configuration schema

### 4.6 Diagnostics (`internal/diagnostics`)
- **HealthCheck:** Engine, acceleration, graphics, storage, network
- **LogAggregation:** Structured logs, crash reports
- **ErrorClassifier:** User-friendly messages with solutions

### 4.7 Download Manager (`internal/download`)
- **ComponentRegistry:** QEMU, WebView2, drivers
- **Verifier:** Hash/signature validation
- **Progress:** Real-time progress, resume support
- **Offline:** Manual path support

### 4.8 AI Assistant (`internal/ai`) - Optional
- **LocalDiagnostics:** Rule-based troubleshooting
- **CloudAdapter:** Optional user-configured API
- **Privacy:** No data upload without consent

## 5. Frontend Pages & Components

### 5.1 Dashboard
- Branding, recent devices, quick actions
- System metrics (CPU, RAM, storage)
- Engine status indicator

### 5.2 Device Creation Wizard (11 Steps)
1. Device name
2. Image selection + compatibility check
3. CPU configuration
4. RAM allocation
5. Storage allocation
6. Display configuration
7. Graphics configuration
8. Audio configuration
9. Network configuration
10. Advanced options
11. Review & create

### 5.3 Device Manager
- List, search, filter devices
- Start/stop/restart
- Edit, clone, delete (with confirmation)
- Device details panel

### 5.4 Live Emulator Window
- Integrated display (WebView2 or Canvas streaming)
- Fullscreen/windowed
- Resolution/DPI controls
- Input capture/release
- Screenshot, clipboard
- Rotation, scaling

### 5.5 Settings (12 Sections)
- Performance, Virtualization, Graphics, Display
- Audio, Network, Storage, Input
- Downloads, Language, Appearance, Advanced
- Logs & Diagnostics

### 5.6 Diagnostic Center
- Categorized issues with severity
- Recommended solutions
- Log viewer, export

## 6. Compatibility Matrix

| Guest Arch | Host Arch | Acceleration | Graphics | Status |
|------------|-----------|--------------|----------|--------|
| x86_64     | x86_64    | WHPX         | virtio-gpu | Full |
| arm64      | x86_64    | WHPX (TCG)   | virtio-gpu | Slow (emulation) |
| x86_64     | arm64     | WHPX         | virtio-gpu | Full (Win 11 24H2+) |
| arm64      | arm64     | WHPX         | virtio-gpu | Full (Win 11 24H2+) |

**Android Image Types:**
- Prebuilt bootable images (jqssun LineageOS QEMU) -> Full
- Android-x86 project ISOs -> Full
- Raw GSI system.img only -> Incomplete (needs kernel, initramfs)
- Cuttlefish via WSL2 -> Full (separate path)

## 7. Performance Presets

### Low-End (<=4GB RAM, <=4 cores)
- RAM: 2GB, CPU: 2 cores
- Graphics: virtio-gpu (software), 720p
- Minimal services, no audio

### Balanced (8-16GB RAM, 4-8 cores)
- RAM: 4GB, CPU: 4 cores
- Graphics: virtio-gpu + Virgil3D, 1080p
- Standard audio/network

### Performance (>=16GB RAM, >=8 cores)
- RAM: 8GB+, CPU: 6-8 cores
- Graphics: virtio-gpu-gl + Virgil3D, 1440p+
- All features enabled

### Manual
- Full control, validation warnings

## 8. Security Requirements

- No shell injection: structured command args only
- Path validation: allowlist directories, no traversal
- Subprocess: restricted tokens, no admin unless required
- Downloads: HTTPS, hash verification, signature check
- Temp files: secure creation, cleanup on exit
- Logs: no sensitive data (paths, images, credentials)
- Config: encrypted sensitive fields (optional)

## 9. Milestones

### M1: Foundation (Week 1-2)
- [ ] Go/Wails project scaffold
- [ ] Hardware detection module
- [ ] Configuration system
- [ ] Basic React frontend with design system
- [ ] Dashboard skeleton

### M2: Virtualization Core (Week 2-3)
- [ ] QEMU binary management (download, verify, version)
- [ ] WHPX detection & validation
- [ ] VM controller (start/stop/monitor)
- [ ] Basic argument builder
- [ ] Process lifecycle management

### M3: Image & Device Management (Week 3-4)
- [ ] Image inspector & classifier
- [ ] Device profile CRUD
- [ ] Creation wizard (all 11 steps)
- [ ] Device manager UI
- [ ] Preset configurations

### M4: Graphics & Display (Week 4-5)
- [ ] Live window integration
- [ ] Display scaling, fullscreen
- [ ] Input handling (keyboard/mouse)
- [ ] Resolution/DPI controls
- [ ] Screenshot/clipboard

### M5: Polish & Production (Week 5-6)
- [ ] Settings (all 12 sections)
- [ ] Diagnostic center
- [ ] Download manager
- [ ] AI assistant (local only)
- [ ] Internationalization (EN/AR + RTL)
- [ ] NSIS installer, code signing
- [ ] Auto-update mechanism
- [ ] Documentation

### M6: Testing & Release (Week 6-7)
- [ ] Unit tests (Go), integration tests
- [ ] E2E tests (Playwright)
- [ ] Performance benchmarks
- [ ] Compatibility testing
- [ ] Security audit
- [ ] v1.0.0 release

## 10. File Structure

```
EmuNexa/
+-- cmd/emu-nexa/              # Main entry point
+-- internal/
|   +-- virtualization/        # QEMU adapter, VM control
|   +-- device/                # Device profiles, presets
|   +-- image/                 # Inspection, classification
|   +-- config/                # Settings, persistence
|   +-- hardware/              # Detection, capabilities
|   +-- diagnostics/           # Health checks, errors
|   +-- download/              # Dependency manager
|   +-- ai/                    # Optional assistant
|   +-- storage/               # Disk management
|   +-- network/               # Network config
|   +-- input/                 # Input handling
|   +-- profile/               # Profile management
|   +-- ui/                    # Backend->frontend bindings
+-- frontend/
|   +-- src/
|   |   +-- components/        # Reusable UI components
|   |   +-- pages/             # Page components
|   |   +-- hooks/             # Custom React hooks
|   |   +-- utils/             # Helpers
|   |   +-- styles/            # Tailwind, design system
|   |   +-- assets/            # Images, fonts, icons
|   |   +-- types/             # TypeScript types
|   +-- public/                # Static assets
+-- build/                     # Build scripts, NSIS
+-- docs/                      # Documentation
+-- scripts/                   # Utility scripts
+-- go.mod
+-- go.sum
+-- wails.json
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
+-- tailwind.config.js
+-- README.md
```

## 11. Key Technical Decisions

1. **Wails over Electron:** Smaller binary, native Go backend, better Windows integration
2. **QEMU + WHPX:** Best Windows virtualization performance without Hyper-V conflicts
3. **virtio-gpu for Android:** Linux guest has mature driver; avoids Windows guest driver issues
4. **No bundled Android images:** Legal compliance; user provides images
5. **Modular virtualization:** Clean interface for future Hyper-V/WHV backends
6. **Zero-config defaults:** Sensible presets for beginners; advanced panel for experts
7. **Offline-first:** Core functionality works without internet
8. **Security by default:** No admin, validated inputs, verified downloads