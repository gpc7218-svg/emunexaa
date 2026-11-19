# EmuNexa

**Modern Android Virtualization Platform for Windows**

EmuNexa is a professional-grade Android emulator built for Windows 10/11, providing a beautiful, modern interface for running Android virtual machines with maximum performance and compatibility.

![EmuNexa Dashboard](docs/images/dashboard.png)

## ✨ Features

### 🎯 Core Virtualization
- **QEMU + WHPX Acceleration** - Hardware-accelerated x86_64 virtualization on Windows 10 2004+ and Windows 11
- **ARM64 Support** - Full ARM64 guest support on Windows 11 24H2+ (with April/May 2025 updates)
- **TCG Fallback** - Software emulation when hardware acceleration is unavailable
- **Multi-Architecture** - Run x86_64 and ARM64 Android images

### 🎨 Modern UI/UX
- **Dark-First Design** - Beautiful dark theme with customizable accent colors
- **RTL Support** - Full English and Arabic localization with proper right-to-left layout
- **Responsive Layout** - Works on screens from 1024px to 4K+
- **Smooth Animations** - 60fps transitions and micro-interactions
- **Accessibility** - WCAG 2.1 AA compliant, high contrast mode, reduced motion support

### 📱 Device Management
- **11-Step Creation Wizard** - Guided device creation with smart defaults
- **Performance Presets** - Low-End, Balanced, Performance, and Manual modes
- **Device Profiles** - Save, clone, and organize multiple device configurations
- **Live Window** - Integrated display with fullscreen, scaling, rotation, screenshots

### 🔧 Advanced Configuration
- **Graphics** - virtio-gpu-pci, VirGL, Venus (Vulkan), software rendering
- **Display** - Custom resolution, DPI, aspect ratio, rotation, multi-monitor
- **Network** - User-mode NAT, TAP, Bridge with port forwarding
- **Storage** - QCOW2/RAW, cache modes, TRIM/discard, snapshots
- **Audio** - PulseAudio, SPICE with configurable sample rates

### 🛡️ Security & Reliability
- **No Shell Injection** - Structured command arguments only
- **Path Validation** - Allowlist directories, no traversal
- **Verified Downloads** - Hash and signature verification
- **No Admin Required** - Standard user privileges for normal operation
- **Crash Recovery** - Automatic cleanup of abandoned processes

### 🔍 Diagnostics & Intelligence
- **System Health Checks** - Virtualization, graphics, storage, network, images, dependencies
- **Smart Compatibility Checker** - Classifies images: Full/Config/Experimental/Incompatible
- **Local AI Assistant** - Rule-based troubleshooting (optional cloud API with user consent)
- **Structured Logging** - Debug, info, warning, error levels with rotation

## 📋 Requirements

### Host System
- **OS**: Windows 10 2004 (build 19041) or Windows 11 (64-bit)
- **CPU**: x86_64 with VT-x (Intel) or SVM (AMD) enabled in BIOS
- **RAM**: Minimum 4 GB (8 GB+ recommended)
- **Storage**: SSD with 10+ GB free space
- **GPU**: DirectX 11+ compatible (for VirGL rendering)

### Windows Features (Auto-detected)
- **Hypervisor Platform** - Required for WHPX acceleration
- **Virtual Machine Platform** - Required for WHPX
- **Hyper-V** - Optional, may conflict with WHPX

### Android Images (User Provided)
EmuNexa does **not** bundle Android images. You must provide your own:

| Image Type | Compatibility | Notes |
|------------|---------------|-------|
| Prebuilt QEMU images (jqssun LineageOS) | ✅ Full | Kernel + initramfs + bootloader included |
| Android-x86 ISOs | ✅ Config | Install to disk first |
| Raw GSI system.img | ❌ Incompatible | Missing kernel, initramfs, bootloader |
| Cuttlefish (via WSL2) | ✅ Full | Separate path |

**Recommended Source**: [jqssun/android-lineage-qemu](https://github.com/jqssun/android-lineage-qemu/releases) - Prebuilt bootable x86_64 images for QEMU

## 🚀 Quick Start

### Installation
1. Download the latest `EmuNexa-Setup.exe` from [Releases](https://github.com/emunexa/emunexa/releases)
2. Run the installer (admin rights required for NSIS)
3. Launch EmuNexa from Start Menu or Desktop

### First Run
1. **Welcome Screen** - EmuNexa detects your hardware capabilities
2. **Import Image** - Click "Import Image" and select your Android image file
3. **Create Device** - Click "Create Device" and follow the 11-step wizard
4. **Start** - Click "Start" on your device to launch the emulator

## 🏗️ Building from Source

### Prerequisites
- **Go 1.23+** - [Download](https://golang.org/dl/)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **Wails v2.17.1+** - `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- **NSIS 3.0+** - For installer (optional)

### Build Commands
```bash
# Clone repository
git clone https://github.com/emunexa/emunexa.git
cd emunexa

# Install frontend dependencies
cd frontend && npm ci && cd ..

# Development mode (hot reload)
wails dev

# Production build
wails build -ldflags "-X github.com/emunexa/emunexa/cmd/emu-nexa.Version=1.0.0"

# With PowerShell build script (Windows)
.\build\build.ps1 -Configuration Release -CreateInstaller -Portable
```

## 📁 Project Structure

```
EmuNexa/
├── cmd/emu-nexa/           # Main entry point
├── internal/
│   ├── config/             # Configuration management
│   ├── device/             # Device profiles & management
│   ├── hardware/           # Hardware detection
│   ├── image/              # Image inspection & classification
│   ├── virtualization/     # QEMU engine & VM control
│   ├── ui/                 # Wails bindings (Go ↔ Frontend)
│   ├── diagnostics/        # Health checks & troubleshooting
│   ├── download/           # Dependency manager
│   ├── ai/                 # Optional AI assistant
│   └── ...                 # Other subsystems
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   ├── styles/         # Tailwind CSS + design system
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
├── build/                  # Build scripts (NSIS, PowerShell)
├── docs/                   # Documentation
└── wails.json              # Wails configuration
```

## ⌨️ Keyboard Shortcuts (Live Window)

| Shortcut | Action |
|----------|--------|
| `F11` | Toggle fullscreen |
| `Escape` | Exit fullscreen |
| `Ctrl+Alt` | Release mouse capture |
| `Ctrl+Alt+Del` | Send Ctrl+Alt+Del to guest |

## 🔧 Configuration

Configuration is stored in `%USERPROFILE%\EmuNexa\config\config.yaml`

Key settings:
```yaml
virtualization:
  engine: "qemu"
  acceleration: "auto"        # auto, whpx, tcg
  default_cpu_arch: "x86_64"

graphics:
  device: "virtio-gpu-pci"
  renderer: "auto"            # auto, virgl, venus, software
  enable_3d: true
  vram: 256

performance_preset: "balanced" # low, balanced, performance, manual
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow Go and TypeScript best practices
- Write tests for new functionality
- Update documentation for user-facing changes
- Ensure accessibility compliance
- Test on both low-end and high-end hardware

## 📄 License

EmuNexa is licensed under the **MIT License** - see [LICENSE](LICENSE) for details.

## ⚖️ Legal Notice

EmuNexa is an independent open-source project and is **not affiliated with, endorsed by, or connected to**:
- Google LLC (Android, Android Open Source Project)
- The QEMU Project
- Microsoft Corporation (Windows, Hyper-V, WHPX)

Android is a trademark of Google LLC. Windows is a trademark of Microsoft Corporation.

## 🙏 Acknowledgments

- [QEMU](https://www.qemu.org/) - The powerful open-source machine emulator
- [Wails](https://wails.io/) - Go + WebView2 desktop framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [lucide-react](https://lucide.dev/) - Beautiful icons
- [jqssun/android-lineage-qemu](https://github.com/jqssun/android-lineage-qemu) - Prebuilt Android images for QEMU

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/emunexa/emunexa/issues)
- **Discussions**: [GitHub Discussions](https://github.com/emunexa/emunexa/discussions)
- **Security**: security@emunexa.dev

---

**EmuNexa** - Maximum control. Maximum compatibility. Maximum performance. Minimum complexity.