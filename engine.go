package virtualization

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/emunexa/emunexa/internal/config"
	"github.com/emunexa/emunexa/internal/hardware"
	"github.com/emunexa/emunexa/internal/device"
)

// EngineInterface defines the interface for virtualization engines
type EngineInterface interface {
	Start(ctx context.Context, vm *device.Device) error
	Stop(ctx context.Context, vm *device.Device) error
	Restart(ctx context.Context, vm *device.Device) error
	Pause(ctx context.Context, vm *device.Device) error
	Resume(ctx context.Context, vm *device.Device) error
	GetStatus(vm *device.Device) (VMStatus, error)
	GetStats(vm *device.Device) (VMStats, error)
	Shutdown() error
	ValidateConfig(vm *device.Device) error
	BuildArgs(vm *device.Device) ([]string, error)
}

// VMStatus represents the status of a virtual machine
type VMStatus string

const (
	VMStatusStopped  VMStatus = "stopped"
	VMStatusStarting VMStatus = "starting"
	VMStatusRunning  VMStatus = "running"
	VMStatusPaused   VMStatus = "paused"
	VMStatusStopping VMStatus = "stopping"
	VMStatusError    VMStatus = "error"
	VMStatusCrashed  VMStatus = "crashed"
)

// VMStats represents runtime statistics of a VM
type VMStats struct {
	CPUUsagePercent    float64 `json:"cpu_usage_percent"`
	MemoryUsageBytes   uint64  `json:"memory_usage_bytes"`
	MemoryAllocatedBytes uint64 `json:"memory_allocated_bytes"`
	DiskReadBytes      uint64  `json:"disk_read_bytes"`
	DiskWriteBytes     uint64  `json:"disk_write_bytes"`
	NetworkRxBytes     uint64  `json:"network_rx_bytes"`
	NetworkTxBytes     uint64  `json:"network_tx_bytes"`
	UptimeSeconds      int64   `json:"uptime_seconds"`
	Status             VMStatus `json:"status"`
	PID                int     `json:"pid"`
}

// Engine manages the virtualization engine
type Engine struct {
	config        *config.VirtualizationConfig
	hwInfo        *hardware.HardwareInfo
	qemuPath      string
	qemuVersion   string
	runningVMs    map[string]*VMInstance
	mu            sync.RWMutex
	downloadMgr   *DownloadManager
}

// VMInstance represents a running VM instance
type VMInstance struct {
	Device     *device.Device
	Cmd        *exec.Cmd
	PID        int
	StartTime  time.Time
	Status     VMStatus
	MonitorSock string
	Stats      VMStats
	CancelFunc context.CancelFunc
}

// DownloadManager handles QEMU binary downloads
type DownloadManager struct {
	downloadDir string
	baseURL     string
}

// NewEngine creates a new virtualization engine
func NewEngine(cfg *config.VirtualizationConfig, hwInfo *hardware.HardwareInfo) (*Engine, error) {
	e := &Engine{
		config:      cfg,
		hwInfo:      hwInfo,
		runningVMs:  make(map[string]*VMInstance),
		downloadMgr: NewDownloadManager(cfg),
	}

	// Find or download QEMU
	qemuPath, err := e.resolveQEMUPath()
	if err != nil {
		return nil, fmt.Errorf("failed to resolve QEMU path: %w", err)
	}
	e.qemuPath = qemuPath

	// Get QEMU version
	version, err := e.getQEMUVersion()
	if err != nil {
		return nil, fmt.Errorf("failed to get QEMU version: %w", err)
	}
	e.qemuVersion = version

	return e, nil
}

// resolveQEMUPath finds the QEMU binary
func (e *Engine) resolveQEMUPath() (string, error) {
	// 1. Check custom path from config
	if e.config.QEMUPath != "" {
		if _, err := os.Stat(e.config.QEMUPath); err == nil {
			return e.config.QEMUPath, nil
		}
	}

	// 2. Check in application directory
	homeDir, _ := os.UserHomeDir()
	appDir := filepath.Join(homeDir, "EmuNexa", "bin")

	// Determine binary name based on architecture
	binaryName := "qemu-system-x86_64.exe"
	if runtime.GOARCH == "arm64" {
		binaryName = "qemu-system-aarch64.exe"
	}

	localPath := filepath.Join(appDir, binaryName)
	if _, err := os.Stat(localPath); err == nil {
		return localPath, nil
	}

	// 3. Check system PATH
	if path, err := exec.LookPath(binaryName); err == nil {
		return path, nil
	}

	// 4. Check for x86_64 binary when on arm64 (cross-arch)
	if runtime.GOARCH == "arm64" {
		if path, err := exec.LookPath("qemu-system-x86_64.exe"); err == nil {
			return path, nil
		}
	}

	return "", fmt.Errorf("QEMU binary not found. Please install QEMU or configure path in settings")
}

// getQEMUVersion gets the QEMU version
func (e *Engine) getQEMUVersion() (string, error) {
	cmd := exec.Command(e.qemuPath, "--version")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(output), "\n")
	if len(lines) > 0 {
		return strings.TrimSpace(lines[0]), nil
	}
	return "unknown", nil
}

// GetQEMUPath returns the QEMU binary path
func (e *Engine) GetQEMUPath() string {
	return e.qemuPath
}

// GetQEMUVersion returns the QEMU version
func (e *Engine) GetQEMUVersion() string {
	return e.qemuVersion
}

// Start starts a virtual machine
func (e *Engine) Start(ctx context.Context, vm *device.Device) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Check if already running
	if instance, exists := e.runningVMs[vm.ID]; exists && instance.Status == VMStatusRunning {
		return fmt.Errorf("VM %s is already running", vm.ID)
	}

	// Validate configuration
	if err := e.ValidateConfig(vm); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	// Build QEMU arguments
	args, err := e.BuildArgs(vm)
	if err != nil {
		return fmt.Errorf("failed to build QEMU arguments: %w", err)
	}

	// Create working directory
	workDir := vm.GetWorkingDir()
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return fmt.Errorf("failed to create working directory: %w", err)
	}

	// Create context with cancellation
	vmCtx, cancel := context.WithCancel(ctx)

	// Build command
	cmd := exec.CommandContext(vmCtx, e.qemuPath, args...)
	cmd.Dir = workDir
	cmd.Env = append(os.Environ(),
		"QEMU_AUDIO_DRV=pa",
		"SDL_VIDEODRIVER=windows",
	)

	// Setup pipes for monitoring
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		cancel()
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Start process
	if err := cmd.Start(); err != nil {
		cancel()
		return fmt.Errorf("failed to start QEMU: %w", err)
	}

	// Create instance
	instance := &VMInstance{
		Device:     vm,
		Cmd:        cmd,
		PID:        cmd.Process.Pid,
		StartTime:  time.Now(),
		Status:     VMStatusStarting,
		CancelFunc: cancel,
	}

	e.runningVMs[vm.ID] = instance

	// Start monitoring goroutines
	go e.monitorProcess(instance, stdout, stderr)
	go e.monitorStats(instance)

	// Wait for VM to be ready (with timeout)
	readyCtx, readyCancel := context.WithTimeout(vmCtx, 30*time.Second)
	defer readyCancel()

	if err := e.waitForReady(readyCtx, instance); err != nil {
		e.Stop(vmCtx, vm)
		return fmt.Errorf("VM failed to start: %w", err)
	}

	instance.Status = VMStatusRunning
	return nil
}

// Stop stops a virtual machine
func (e *Engine) Stop(ctx context.Context, vm *device.Device) error {
	e.mu.Lock()
	instance, exists := e.runningVMs[vm.ID]
	e.mu.Unlock()

	if !exists {
		return fmt.Errorf("VM %s is not running", vm.ID)
	}

	instance.Status = VMStatusStopping

	// Try graceful shutdown via QEMU monitor
	if instance.MonitorSock != "" {
		e.sendMonitorCommand(instance, "system_powerdown")
		// Wait for graceful shutdown
		select {
		case <-ctx.Done():
		case <-time.After(10 * time.Second):
		}
	}

	// Force kill if still running
	if instance.Cmd != nil && instance.Cmd.Process != nil {
		instance.CancelFunc()
		instance.Cmd.Process.Kill()
		instance.Cmd.Wait()
	}

	instance.Status = VMStatusStopped

	e.mu.Lock()
	delete(e.runningVMs, vm.ID)
	e.mu.Unlock()

	return nil
}

// Restart restarts a virtual machine
func (e *Engine) Restart(ctx context.Context, vm *device.Device) error {
	if err := e.Stop(ctx, vm); err != nil {
		return err
	}
	time.Sleep(1 * time.Second)
	return e.Start(ctx, vm)
}

// Pause pauses a virtual machine
func (e *Engine) Pause(ctx context.Context, vm *device.Device) error {
	e.mu.RLock()
	instance, exists := e.runningVMs[vm.ID]
	e.mu.RUnlock()

	if !exists {
		return fmt.Errorf("VM %s is not running", vm.ID)
	}

	if err := e.sendMonitorCommand(instance, "stop"); err != nil {
		return err
	}

	instance.Status = VMStatusPaused
	return nil
}

// Resume resumes a paused virtual machine
func (e *Engine) Resume(ctx context.Context, vm *device.Device) error {
	e.mu.RLock()
	instance, exists := e.runningVMs[vm.ID]
	e.mu.RUnlock()

	if !exists {
		return fmt.Errorf("VM %s is not running", vm.ID)
	}

	if err := e.sendMonitorCommand(instance, "cont"); err != nil {
		return err
	}

	instance.Status = VMStatusRunning
	return nil
}

// GetStatus returns the status of a virtual machine
func (e *Engine) GetStatus(vm *device.Device) (VMStatus, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	instance, exists := e.runningVMs[vm.ID]
	if !exists {
		return VMStatusStopped, nil
	}

	return instance.Status, nil
}

// GetStats returns runtime statistics of a virtual machine
func (e *Engine) GetStats(vm *device.Device) (VMStats, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	instance, exists := e.runningVMs[vm.ID]
	if !exists {
		return VMStats{Status: VMStatusStopped}, nil
	}

	// Update stats from process
	if instance.Cmd != nil && instance.Cmd.Process != nil {
		// On Windows, we'd use GetProcessMemoryInfo etc.
		// For now, return cached stats
	}

	return instance.Stats, nil
}

// Shutdown shuts down the engine and all running VMs
func (e *Engine) Shutdown() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	for id, instance := range e.runningVMs {
		instance.CancelFunc()
		if instance.Cmd != nil && instance.Cmd.Process != nil {
			instance.Cmd.Process.Kill()
		}
		delete(e.runningVMs, id)
	}

	return nil
}

// ValidateConfig validates a VM configuration
func (e *Engine) ValidateConfig(vm *device.Device) error {
	var errors []string

	// Check CPU cores
	if vm.CPU.Cores < 1 || vm.CPU.Cores > e.hwInfo.CPU.LogicalCores {
		errors = append(errors, fmt.Sprintf("CPU cores must be between 1 and %d", e.hwInfo.CPU.LogicalCores))
	}

	// Check RAM
	ramBytes := uint64(vm.Memory.SizeMB) * 1024 * 1024
	if ramBytes < 512*1024*1024 { // 512MB minimum
		errors = append(errors, "RAM must be at least 512MB")
	}
	if ramBytes > e.hwInfo.Memory.TotalBytes/2 { // Don't use more than half
		errors = append(errors, fmt.Sprintf("RAM should not exceed 50%% of host memory (%d MB)", e.hwInfo.Memory.TotalBytes/2/1024/1024))
	}

	// Check storage
	if vm.Storage.SizeBytes < 1024*1024*1024 { // 1GB minimum
		errors = append(errors, "Storage must be at least 1GB")
	}

	// Check image exists
	if vm.Image.Path != "" {
		if _, err := os.Stat(vm.Image.Path); os.IsNotExist(err) {
			errors = append(errors, "Android image file not found")
		}
	}

	// Check acceleration support
	if vm.Virtualization.Acceleration == "whpx" && !e.hwInfo.Virtualization.WHPXAvailable {
		errors = append(errors, "WHPX acceleration requested but not available on this system")
	}

	// Check graphics device
	validDevices := []string{"virtio-gpu-pci", "virtio-gpu-gl-pci", "virtio-vga", "qxl"}
	found := false
	for _, d := range validDevices {
		if d == vm.Graphics.Device {
			found = true
			break
		}
	}
	if !found {
		errors = append(errors, "Invalid graphics device")
	}

	if len(errors) > 0 {
		return fmt.Errorf("validation failed: %s", strings.Join(errors, "; "))
	}

	return nil
}

// BuildArgs builds QEMU command line arguments
func (e *Engine) BuildArgs(vm *device.Device) ([]string, error) {
	var args []string

	// Determine architecture
	arch := vm.CPU.Architecture
	if arch == "" {
		arch = e.config.DefaultCPUArch
	}

	// Base arguments
	args = append(args,
		"-name", vm.Name,
		"-pidfile", filepath.Join(vm.GetWorkingDir(), "qemu.pid"),
	)

	// Machine type
	machine := e.config.DefaultMachine
	if vm.Virtualization.MachineType != "" {
		machine = vm.Virtualization.MachineType
	}
	args = append(args, "-M", machine)

	// CPU configuration
	if e.config.CPUModel != "" {
		args = append(args, "-cpu", e.config.CPUModel)
	}
	args = append(args, "-smp", fmt.Sprintf("cores=%d,threads=%d,sockets=1", vm.CPU.Cores, vm.CPU.Threads))

	// Memory
	args = append(args, "-m", fmt.Sprintf("%dM", vm.Memory.SizeMB))
	if vm.Memory.EnableBalloon {
		args = append(args, "-device", "virtio-balloon-pci")
	}

	// Acceleration
	accel := e.config.Acceleration
	if vm.Virtualization.Acceleration != "" {
		accel = vm.Virtualization.Acceleration
	}
	if accel == "auto" {
		if e.hwInfo.Virtualization.WHPXAvailable {
			accel = "whpx"
		} else {
			accel = "tcg"
		}
	}
	if accel != "none" && accel != "tcg" {
		args = append(args, "-accel", accel)
	}

	// Graphics/Display
	args = append(args, e.buildGraphicsArgs(vm)...)

	// Storage
	args = append(args, e.buildStorageArgs(vm)...)

	// Network
	args = append(args, e.buildNetworkArgs(vm)...)

	// Audio
	args = append(args, e.buildAudioArgs(vm)...)

	// Input
	args = append(args, e.buildInputArgs(vm)...)

	// USB
	if vm.Advanced.USBEnabled {
		args = append(args, "-device", "qemu-xhci")
		for _, usb := range vm.Advanced.USBDevices {
			args = append(args, "-device", fmt.Sprintf("usb-host,hostbus=%s", usb))
		}
	}

	// Monitor socket for control
	monitorSock := filepath.Join(vm.GetWorkingDir(), "monitor.sock")
	args = append(args, "-monitor", fmt.Sprintf("unix:%s,server,nowait", monitorSock))
	// Store for later use
	vm.SetMonitorSock(monitorSock)

	// Serial for logging
	if e.config.EnableDebug {
		logFile := filepath.Join(vm.GetWorkingDir(), "serial.log")
		args = append(args, "-serial", fmt.Sprintf("file:%s", logFile))
	}

	// Guest agent
	if e.config.EnableGuestAgent {
		args = append(args, "-device", "virtio-serial-pci")
		args = append(args, "-device", "virtserialport,chardev=guestagent,name=org.qemu.guest_agent.0")
		args = append(args, "-chardev", "socket,id=guestagent,path="+filepath.Join(vm.GetWorkingDir(), "guest-agent.sock"),server,nowait")
	}

	// Additional custom args
	args = append(args, e.config.QEMUArgs...)
	args = append(args, vm.Advanced.ExtraArgs...)

	// Kernel/initrd for direct boot (if specified)
	if vm.Image.KernelPath != "" {
		args = append(args, "-kernel", vm.Image.KernelPath)
	}
	if vm.Image.InitrdPath != "" {
		args = append(args, "-initrd", vm.Image.InitrdPath)
	}
	if vm.Image.KernelArgs != "" {
		args = append(args, "-append", vm.Image.KernelArgs)
	}

	// Boot order
	bootOrder := e.config.BootOrder
	if vm.Virtualization.BootOrder != "" {
		bootOrder = vm.Virtualization.BootOrder
	}
	args = append(args, "-boot", fmt.Sprintf("order=%s", bootOrder))

	// RTC
	if e.config.RTCEnabled {
		args = append(args, "-rtc", "base=utc,clock=host")
	}

	// ACPI/HPET
	if e.config.ACPIEnabled {
		args = append(args, "-acpitable", "file=/usr/share/qemu/acpi-dsdt.aml")
	}
	if e.config.HPETEnabled {
		args = append(args, "-device", "hpet")
	}

	// Memory backing
	if e.config.HugePages {
		args = append(args, "-mem-prealloc")
	}

	// IO thread
	if e.config.IOThread {
		args = append(args, "-object", "iothread,id=iothread0")
	}

	return args, nil
}

// buildGraphicsArgs builds graphics-related arguments
func (e *Engine) buildGraphicsArgs(vm *device.Device) []string {
	var args []string

	device := vm.Graphics.Device
	if device == "" {
		device = e.config.Graphics.Device
	}

	renderer := vm.Graphics.Renderer
	if renderer == "" {
		renderer = e.config.Graphics.Renderer
	}

	// Display device
	args = append(args, "-device", device)

	// Display backend
	if vm.Display.Headless {
		args = append(args, "-display", "none")
	} else {
		displayArgs := []string{"sdl"}

		if e.config.Graphics.Enable3D && (device == "virtio-gpu-pci" || device == "virtio-gpu-gl-pci") {
			displayArgs = append(displayArgs, "gl=on")
			if renderer == "virgl" || renderer == "auto" {
				displayArgs = append(displayArgs, "renderer=virgl")
			} else if renderer == "venus" {
				displayArgs = append(displayArgs, "renderer=venus")
			}
		}

		if vm.Display.VSync {
			displayArgs = append(displayArgs, "vsync=on")
		}

		args = append(args, "-display", strings.Join(displayArgs, ","))
	}

	// Resolution
	if vm.Display.Width > 0 && vm.Display.Height > 0 {
		// This is handled by the guest, but we can set initial size
		args = append(args, "-device", fmt.Sprintf("%s,xres=%d,yres=%d", device, vm.Display.Width, vm.Display.Height))
	}

	// DPI
	if vm.Display.DPI > 0 {
		args = append(args, "-device", fmt.Sprintf("%s,dpi=%d", device, vm.Display.DPI))
	}

	return args
}

// buildStorageArgs builds storage-related arguments
func (e *Engine) buildStorageArgs(vm *device.Device) []string {
	var args []string

	// System image (read-only typically)
	if vm.Image.Path != "" {
		format := vm.Storage.Format
		if format == "" {
			format = e.config.Storage.Format
		}

		cacheMode := vm.Storage.CacheMode
		if cacheMode == "" {
			cacheMode = e.config.Storage.CacheMode
		}

		discard := vm.Storage.Discard
		if discard == "" {
			discard = e.config.Storage.Discard
		}

		detectZeroes := vm.Storage.DetectZeroes
		if detectZeroes == "" {
			detectZeroes = e.config.Storage.DetectZeroes
		}

		driveOpts := []string{
			fmt.Sprintf("file=%s", vm.Image.Path),
			fmt.Sprintf("format=%s", format),
			fmt.Sprintf("cache=%s", cacheMode),
			fmt.Sprintf("discard=%s", discard),
			fmt.Sprintf("detect-zeroes=%s", detectZeroes),
			"if=virtio",
			"media=disk",
		}

		if vm.Image.ReadOnly {
			driveOpts = append(driveOpts, "readonly=on")
		}

		args = append(args, "-drive", strings.Join(driveOpts, ","))
	}

	// Userdata disk
	if vm.Storage.SizeBytes > 0 {
		userdataPath := filepath.Join(vm.GetWorkingDir(), "userdata.qcow2")

		// Create if doesn't exist
		if _, err := os.Stat(userdataPath); os.IsNotExist(err) {
			e.createDiskImage(userdataPath, vm.Storage.SizeBytes, vm.Storage.Format)
		}

		driveOpts := []string{
			fmt.Sprintf("file=%s", userdataPath),
			fmt.Sprintf("format=%s", vm.Storage.Format),
			fmt.Sprintf("cache=%s", cacheMode),
			"if=virtio",
			"media=disk",
		}

		args = append(args, "-drive", strings.Join(driveOpts, ","))
	}

	// CDROM for ISO
	if vm.Image.CDROMPath != "" {
		args = append(args, "-cdrom", vm.Image.CDROMPath)
	}

	return args
}

// createDiskImage creates a new disk image
func (e *Engine) createDiskImage(path string, sizeBytes uint64, format string) error {
	// Use qemu-img to create
	qemuImgPath := strings.Replace(e.qemuPath, "qemu-system-", "qemu-img", 1)
	if runtime.GOOS == "windows" {
		qemuImgPath = strings.Replace(qemuImgPath, ".exe", ".exe", 1)
	}

	cmd := exec.Command(qemuImgPath, "create", "-f", format, path, fmt.Sprintf("%d", sizeBytes))
	return cmd.Run()
}

// buildNetworkArgs builds network-related arguments
func (e *Engine) buildNetworkArgs(vm *device.Device) []string {
	var args []string

	mode := vm.Network.Mode
	if mode == "" {
		mode = e.config.Network.Mode
	}

	switch mode {
	case "user":
		netdevArgs := []string{
			"id=n0",
			"netdev=user",
		}

		// Port forwards
		for _, pf := range e.config.Network.PortForwards {
			netdevArgs = append(netdevArgs, fmt.Sprintf("hostfwd=%s::%d-:%d", pf.Protocol, pf.HostPort, pf.GuestPort))
		}
		for _, pf := range vm.Network.PortForwards {
			netdevArgs = append(netdevArgs, fmt.Sprintf("hostfwd=%s::%d-:%d", pf.Protocol, pf.HostPort, pf.GuestPort))
		}

		// DHCP range
		if e.config.Network.DHCPStart != "" && e.config.Network.DHCPEnd != "" {
			netdevArgs = append(netdevArgs, fmt.Sprintf("dhcpstart=%s", e.config.Network.DHCPStart))
			netdevArgs = append(netdevArgs, fmt.Sprintf("dhcpend=%s", e.config.Network.DHCPEnd))
		}

		// DNS
		for _, dns := range e.config.Network.DNSServers {
			netdevArgs = append(netdevArgs, fmt.Sprintf("dns=%s", dns))
		}

		args = append(args, "-netdev", strings.Join(netdevArgs, ","))
		args = append(args, "-device", "virtio-net-pci,netdev=n0")

	case "tap":
		// TAP networking (requires admin)
		args = append(args, "-netdev", "tap,id=n0,ifname="+vm.Network.TapInterface)
		args = append(args, "-device", "virtio-net-pci,netdev=n0")

	case "bridge":
		// Bridge networking
		args = append(args, "-netdev", "bridge,id=n0,br="+vm.Network.BridgeInterface)
		args = append(args, "-device", "virtio-net-pci,netdev=n0")

	case "none":
		// No network
	default:
		// Default to user mode
		args = append(args, "-netdev", "user,id=n0")
		args = append(args, "-device", "virtio-net-pci,netdev=n0")
	}

	return args
}

// buildAudioArgs builds audio-related arguments
func (e *Engine) buildAudioArgs(vm *device.Device) []string {
	var args []string

	if !vm.Audio.Enabled && !e.config.Audio.Enabled {
		return args
	}

	device := vm.Audio.Device
	if device == "" {
		device = e.config.Audio.Device
	}

	sampleRate := vm.Audio.SampleRate
	if sampleRate == 0 {
		sampleRate = e.config.Audio.SampleRate
	}

	switch device {
	case "pa":
		args = append(args, "-audiodev", fmt.Sprintf("pa,id=audio0,out.sample-rate=%d,in.sample-rate=%d", sampleRate, sampleRate))
		args = append(args, "-device", "intel-hda")
		args = append(args, "-device", "hda-output,audiodev=audio0")
		args = append(args, "-device", "hda-input,audiodev=audio0")
	case "spice":
		args = append(args, "-audiodev", "spice,id=audio0")
		args = append(args, "-device", "intel-hda")
		args = append(args, "-device", "hda-output,audiodev=audio0")
	}

	return args
}

// buildInputArgs builds input-related arguments
func (e *Engine) buildInputArgs(vm *device.Device) []string {
	var args []string

	// Keyboard
	keyboardLayout := vm.Input.KeyboardLayout
	if keyboardLayout == "" {
		keyboardLayout = e.config.Input.KeyboardLayout
	}
	args = append(args, "-k", keyboardLayout)

	// Mouse
	mouseMode := vm.Input.MouseMode
	if mouseMode == "" {
		mouseMode = e.config.Input.MouseMode
	}

	if mouseMode == "absolute" {
		args = append(args, "-device", "virtio-mouse-pci")
	} else {
		args = append(args, "-device", "virtio-tablet-pci")
	}

	// Gamepad
	if vm.Input.EnableGamepad || e.config.Input.EnableGamepad {
		args = append(args, "-device", "virtio-input-host-pci,evdev=/dev/input/event0")
	}

	return args
}

// waitForReady waits for the VM to be ready
func (e *Engine) waitForReady(ctx context.Context, instance *VMInstance) error {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			// Check if process is still alive
			if instance.Cmd.ProcessState != nil && instance.Cmd.ProcessState.Exited() {
				return fmt.Errorf("QEMU process exited unexpectedly")
			}

			// Try to connect to monitor socket
			if instance.MonitorSock != "" {
				if e.testMonitorConnection(instance.MonitorSock) {
					return nil
				}
			}

			// Check for serial output indicating boot
			// This would require reading from the serial log
		}
	}
}

// testMonitorConnection tests the QEMU monitor connection
func (e *Engine) testMonitorConnection(sockPath string) bool {
	// On Windows, Unix sockets might not work the same way
	// This is a placeholder - would use named pipes or TCP on Windows
	return false
}

// sendMonitorCommand sends a command to QEMU monitor
func (e *Engine) sendMonitorCommand(instance *VMInstance, command string) error {
	// Implementation would connect to monitor socket and send command
	// For Windows, this might use named pipes or TCP
	return nil
}

// monitorProcess monitors the QEMU process
func (e *Engine) monitorProcess(instance *VMInstance, stdout, stderr *os.File) {
	// Read output for logging
	// This would be implemented with proper log handling
	instance.Cmd.Wait()

	e.mu.Lock()
	instance.Status = VMStatusStopped
	delete(e.runningVMs, instance.Device.ID)
	e.mu.Unlock()
}

// monitorStats monitors VM statistics
func (e *Engine) monitorStats(instance *VMInstance) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			e.mu.RLock()
			if instance.Status != VMStatusRunning {
				e.mu.RUnlock()
				return
			}
			e.mu.RUnlock()

			// Update stats from process
			// On Windows, would use GetProcessMemoryInfo, GetProcessTimes, etc.
			instance.Stats.UptimeSeconds = int64(time.Since(instance.StartTime).Seconds())
		}
	}
}

// GetRunningVMs returns all running VMs
func (e *Engine) GetRunningVMs() map[string]*VMInstance {
	e.mu.RLock()
	defer e.mu.RUnlock()

	result := make(map[string]*VMInstance)
	for k, v := range e.runningVMs {
		result[k] = v
	}
	return result
}

// IsRunning checks if a VM is running
func (e *Engine) IsRunning(vmID string) bool {
	e.mu.RLock()
	defer e.mu.RUnlock()

	instance, exists := e.runningVMs[vmID]
	return exists && instance.Status == VMStatusRunning
}

// AccelerationInfo returns information about available acceleration
func (e *Engine) AccelerationInfo() AccelerationInfo {
	info := AccelerationInfo{
		WHPXAvailable:   e.hwInfo.Virtualization.WHPXAvailable,
		TCGAvailable:    true, // TCG is always available
		Recommended:     e.hwInfo.Virtualization.RecommendedAccel,
		Current:         e.config.Acceleration,
	}

	if e.hwInfo.Virtualization.WHPXAvailable {
		info.Available = append(info.Available, "whpx")
	}
	info.Available = append(info.Available, "tcg")

	return info
}

// AccelerationInfo contains acceleration information
type AccelerationInfo struct {
	WHPXAvailable bool     `json:"whpx_available"`
	TCGAvailable  bool     `json:"tcg_available"`
	Available     []string `json:"available"`
	Recommended   string   `json:"recommended"`
	Current       string   `json:"current"`
}