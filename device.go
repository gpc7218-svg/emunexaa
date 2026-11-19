package device

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/emunexa/emunexa/internal/config"
	"github.com/emunexa/emunexa/internal/image"
	"github.com/google/uuid"
)

// Device represents a virtual Android device
type Device struct {
	ID              string              `json:"id"`
	Name            string              `json:"name"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
	LastUsedAt      *time.Time          `json:"last_used_at,omitempty"`

	// Image configuration
	Image           ImageConfig         `json:"image"`

	// CPU configuration
	CPU             CPUConfig           `json:"cpu"`

	// Memory configuration
	Memory          MemoryConfig        `json:"memory"`

	// Storage configuration
	Storage         StorageConfig       `json:"storage"`

	// Display configuration
	Display         DisplayConfig       `json:"display"`

	// Graphics configuration
	Graphics        GraphicsConfig      `json:"graphics"`

	// Audio configuration
	Audio           AudioConfig         `json:"audio"`

	// Network configuration
	Network         NetworkConfig       `json:"network"`

	// Input configuration
	Input           InputConfig         `json:"input"`

	// Virtualization configuration
	Virtualization  VirtualizationConfig `json:"virtualization"`

	// Advanced configuration
	Advanced        AdvancedConfig      `json:"advanced"`

	// Metadata
	Tags            []string            `json:"tags,omitempty"`
	Description     string              `json:"description,omitempty"`
	Icon            string              `json:"icon,omitempty"` // Base64 encoded or path
}

// ImageConfig represents the Android image configuration
type ImageConfig struct {
	Path          string `json:"path"`            // Path to the main image
	KernelPath    string `json:"kernel_path"`     // Custom kernel path
	InitrdPath    string `json:"initrd_path"`     // Custom initrd path
	KernelArgs    string `json:"kernel_args"`     // Kernel command line
	CDROMPath     string `json:"cdrom_path"`      // ISO/CDROM path
	ReadOnly      bool   `json:"read_only"`       // Mount image read-only
	Architecture  string `json:"architecture"`    // x86_64, arm64, etc.
	Format        string `json:"format"`          // raw, qcow2, iso, etc.
	Compatibility string `json:"compatibility"`   // full, config, experimental, incompatible
	InspectedAt   *time.Time `json:"inspected_at,omitempty"`
	Inspection    *image.InspectionResult `json:"inspection,omitempty"`
}

// CPUConfig represents CPU configuration
type CPUConfig struct {
	Architecture string `json:"architecture"` // x86_64, arm64
	Cores        int    `json:"cores"`        // Number of CPU cores
	Threads      int    `json:"threads"`      // Threads per core
	Model        string `json:"model"`        // CPU model (host, max, specific)
	Topology     string `json:"topology"`     // CPU topology (sockets,cores,threads)
}

// MemoryConfig represents memory configuration
type MemoryConfig struct {
	SizeMB        int  `json:"size_mb"`         // RAM size in MB
	EnableBalloon bool `json:"enable_balloon"`  // Enable memory ballooning
	HugePages     bool `json:"huge_pages"`      // Use huge pages
	MemoryBacking string `json:"memory_backing"` // ram, hugepages, file
}

// StorageConfig represents storage configuration
type StorageConfig struct {
	SizeBytes     uint64 `json:"size_bytes"`      // Disk size in bytes
	Format        string `json:"format"`          // qcow2, raw
	CacheMode     string `json:"cache_mode"`      // writeback, writethrough, none, directsync, unsafe
	Discard       string `json:"discard"`         // unmap, ignore
	DetectZeroes  string `json:"detect_zeroes"`   // on, off, unmap
	Interface     string `json:"interface"`       // virtio, scsi, sata
	IOThread      bool   `json:"io_thread"`       // Use IO thread
}

// DisplayConfig represents display configuration
type DisplayConfig struct {
	Width         int     `json:"width"`          // Width in pixels
	Height        int     `json:"height"`         // Height in pixels
	DPI           int     `json:"dpi"`            // DPI
	Scale         float64 `json:"scale"`          // Display scale factor
	Fullscreen    bool    `json:"fullscreen"`     // Start in fullscreen
	VSync         bool    `json:"vsync"`          // Enable VSync
	AspectRatio   string  `json:"aspect_ratio"`   // 16:9, 4:3, free
	Rotation      int     `json:"rotation"`       // 0, 90, 180, 270
	Headless      bool    `json:"headless"`       // Run without display
	ShowCursor    bool    `json:"show_cursor"`    // Show mouse cursor
	CaptureCursor bool    `json:"capture_cursor"` // Capture cursor on focus
	MultiMonitor  bool    `json:"multi_monitor"`  // Multi-monitor support
}

// GraphicsConfig represents graphics configuration
type GraphicsConfig struct {
	Device      string `json:"device"`       // virtio-gpu-pci, virtio-gpu-gl-pci, virtio-vga, qxl
	Renderer    string `json:"renderer"`     // auto, virgl, venus, software
	Enable3D    bool   `json:"enable_3d"`    // Enable 3D acceleration
	EnableVirgl bool   `json:"enable_virgl"` // Enable Virgil3D
	VRAM        int    `json:"vram"`         // VRAM in MB
	EnableGlSl  bool   `json:"enable_glsl"`  // Enable GLSL
}

// AudioConfig represents audio configuration
type AudioConfig struct {
	Enabled      bool   `json:"enabled"`       // Enable audio
	Device       string `json:"device"`        // pa, spice, none
	SampleRate   int    `json:"sample_rate"`   // 44100, 48000
	BufferSize   int    `json:"buffer_size"`   // Buffer size in frames
	Channels     int    `json:"channels"`      // 1, 2
	InputDevice  string `json:"input_device"`  // Microphone input
	OutputDevice string `json:"output_device"` // Speaker output
}

// NetworkConfig represents network configuration
type NetworkConfig struct {
	Mode           string        `json:"mode"`            // user, tap, bridge, none
	HostIP         string        `json:"host_ip"`         // Host IP for tap/bridge
	TapInterface   string        `json:"tap_interface"`   // TAP interface name
	BridgeInterface string       `json:"bridge_interface"` // Bridge interface name
	DHCPStart      string        `json:"dhcp_start"`      // DHCP start IP
	DHCPEnd        string        `json:"dhcp_end"`        // DHCP end IP
	DNSServers     []string      `json:"dns_servers"`     // DNS servers
	PortForwards   []PortForward `json:"port_forwards"`   // Port forwards
	EnableIPv6     bool          `json:"enable_ipv6"`     // Enable IPv6
	IsolateNetwork bool          `json:"isolate_network"` // Isolate from host network
	MACAddress     string        `json:"mac_address"`     // MAC address
}

// PortForward represents a port forwarding rule
type PortForward struct {
	Protocol string `json:"protocol"` // tcp, udp
	HostPort int    `json:"host_port"`
	GuestPort int   `json:"guest_port"`
	GuestIP  string `json:"guest_ip"`
}

// InputConfig represents input configuration
type InputConfig struct {
	KeyboardLayout  string            `json:"keyboard_layout"`  // en-us, ar, etc.
	MouseMode       string            `json:"mouse_mode"`       // relative, absolute
	MouseSensitivity float64          `json:"mouse_sensitivity"`
	KeyMapping      map[string]string `json:"key_mapping"`      // Custom key mappings
	EnableGamepad   bool              `json:"enable_gamepad"`   // Enable gamepad
	GamepadMapping  string            `json:"gamepad_mapping"`  // Gamepad mapping
}

// VirtualizationConfig represents virtualization-specific configuration
type VirtualizationConfig struct {
	Acceleration string `json:"acceleration"` // whpx, tcg, auto
	MachineType  string `json:"machine_type"` // pc, virt, etc.
	BootOrder    string `json:"boot_order"`   // c, d, n
	KernelPath   string `json:"kernel_path"`  // Override kernel
	InitrdPath   string `json:"initrd_path"`  // Override initrd
	KernelArgs   string `json:"kernel_args"`  // Override kernel args
	BIOSPath     string `json:"bios_path"`    // Custom BIOS
	UEFIPath     string `json:"uefi_path"`    // Custom UEFI firmware
	EnableSecureBoot bool `json:"enable_secure_boot"`
	TPMEnabled   bool   `json:"tpm_enabled"`  // Enable TPM
}

// AdvancedConfig represents advanced/expert configuration
type AdvancedConfig struct {
	ExtraArgs        []string `json:"extra_args"`         // Additional QEMU arguments
	EnableDebug      bool     `json:"enable_debug"`       // Enable debug logging
	DebugLogFile     string   `json:"debug_log_file"`     // Debug log file
	GDBPort          int      `json:"gdb_port"`           // GDB stub port
	MonitorPort      int      `json:"monitor_port"`       // QEMU monitor port
	SerialPort       string   `json:"serial_port"`        // Serial output
	EnableGuestAgent bool     `json:"enable_guest_agent"` // QEMU guest agent
	BalloonMemory    bool     `json:"balloon_memory"`     // Memory ballooning
	HugePages        bool     `json:"huge_pages"`         // Use huge pages
	CPUPinning       []int    `json:"cpu_pinning"`        // CPU core pinning
	IOThread         bool     `json:"io_thread"`          // IO thread for disks
	MemoryBacking    string   `json:"memory_backing"`     // ram, hugepages, file
	SMBIOSType       string   `json:"smbios_type"`        // SMBIOS type
	ACPIEnabled      bool     `json:"acpi_enabled"`       // ACPI
	HPETEnabled      bool     `json:"hpet_enabled"`       // HPET timer
	RTCEnabled       bool     `json:"rtc_enabled"`        // RTC
	USBEnabled       bool     `json:"usb_enabled"`        // USB passthrough
	USBDevices       []string `json:"usb_devices"`        // USB device filters
	CustomSMBIOS     string   `json:"custom_smbios"`      // Custom SMBIOS data
	EnvVars          map[string]string `json:"env_vars"`  // Environment variables
}

// DeviceManager manages device profiles
type DeviceManager struct {
	devicesDir string
	devices    map[string]*Device
}

// NewDeviceManager creates a new device manager
func NewDeviceManager(baseDir string) (*DeviceManager, error) {
	devicesDir := filepath.Join(baseDir, "devices")
	if err := os.MkdirAll(devicesDir, 0755); err != nil {
		return nil, err
	}

	dm := &DeviceManager{
		devicesDir: devicesDir,
		devices:    make(map[string]*Device),
	}

	if err := dm.loadDevices(); err != nil {
		return nil, err
	}

	return dm, nil
}

// loadDevices loads all device profiles from disk
func (dm *DeviceManager) loadDevices() error {
	entries, err := os.ReadDir(dm.devicesDir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if strings.HasSuffix(entry.Name(), ".json") {
			path := filepath.Join(dm.devicesDir, entry.Name())
			data, err := os.ReadFile(path)
			if err != nil {
				continue
			}

			var device Device
			if err := json.Unmarshal(data, &device); err != nil {
				continue
			}

			dm.devices[device.ID] = &device
		}
	}

	return nil
}

// Create creates a new device
func (dm *DeviceManager) Create(device *Device) error {
	if device.ID == "" {
		device.ID = uuid.New().String()
	}

	now := time.Now()
	device.CreatedAt = now
	device.UpdatedAt = now

	if err := dm.saveDevice(device); err != nil {
		return err
	}

	dm.devices[device.ID] = device
	return nil
}

// Get retrieves a device by ID
func (dm *DeviceManager) Get(id string) (*Device, bool) {
	device, exists := dm.devices[id]
	return device, exists
}

// GetAll returns all devices
func (dm *DeviceManager) GetAll() []*Device {
	devices := make([]*Device, 0, len(dm.devices))
	for _, d := range dm.devices {
		devices = append(devices, d)
	}
	return devices
}

// Update updates an existing device
func (dm *DeviceManager) Update(device *Device) error {
	if _, exists := dm.devices[device.ID]; !exists {
		return fmt.Errorf("device not found: %s", device.ID)
	}

	device.UpdatedAt = time.Now()
	if err := dm.saveDevice(device); err != nil {
		return err
	}

	dm.devices[device.ID] = device
	return nil
}

// Delete deletes a device
func (dm *DeviceManager) Delete(id string) error {
	if _, exists := dm.devices[id]; !exists {
		return fmt.Errorf("device not found: %s", id)
	}

	path := filepath.Join(dm.devicesDir, id+".json")
	if err := os.Remove(path); err != nil {
		return err
	}

	delete(dm.devices, id)
	return nil
}

// Clone clones a device with a new name
func (dm *DeviceManager) Clone(id, newName string) (*Device, error) {
	original, exists := dm.devices[id]
	if !exists {
		return nil, fmt.Errorf("device not found: %s", id)
	}

	// Deep copy
	data, err := json.Marshal(original)
	if err != nil {
		return nil, err
	}

	var clone Device
	if err := json.Unmarshal(data, &clone); err != nil {
		return nil, err
	}

	clone.ID = uuid.New().String()
	clone.Name = newName
	clone.CreatedAt = time.Now()
	clone.UpdatedAt = time.Now()
	clone.LastUsedAt = nil

	// Update working directory paths
	clone.Storage.SizeBytes = original.Storage.SizeBytes

	if err := dm.Create(&clone); err != nil {
		return nil, err
	}

	return &clone, nil
}

// saveDevice saves a device to disk
func (dm *DeviceManager) saveDevice(device *Device) error {
	path := filepath.Join(dm.devicesDir, device.ID+".json")
	data, err := json.MarshalIndent(device, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// GetWorkingDir returns the working directory for a device
func (d *Device) GetWorkingDir() string {
	homeDir, _ := os.UserHomeDir()
	return filepath.Join(homeDir, "EmuNexa", "vms", d.ID)
}

// SetMonitorSock sets the monitor socket path
func (d *Device) SetMonitorSock(path string) {
	if d.Advanced.EnvVars == nil {
		d.Advanced.EnvVars = make(map[string]string)
	}
	d.Advanced.EnvVars["QEMU_MONITOR_SOCK"] = path
}

// GetMonitorSock returns the monitor socket path
func (d *Device) GetMonitorSock() string {
	if d.Advanced.EnvVars != nil {
		return d.Advanced.EnvVars["QEMU_MONITOR_SOCK"]
	}
	return ""
}

// MarkUsed updates the last used timestamp
func (d *Device) MarkUsed() {
	now := time.Now()
	d.LastUsedAt = &now
}

// Validate validates the device configuration
func (d *Device) Validate() []error {
	var errors []error

	// Name validation
	if d.Name == "" {
		errors = append(errors, fmt.Errorf("device name is required"))
	}
	if len(d.Name) > 100 {
		errors = append(errors, fmt.Errorf("device name too long (max 100 characters)"))
	}

	// CPU validation
	if d.CPU.Cores < 1 || d.CPU.Cores > 64 {
		errors = append(errors, fmt.Errorf("CPU cores must be between 1 and 64"))
	}
	if d.CPU.Threads < 1 || d.CPU.Threads > 8 {
		errors = append(errors, fmt.Errorf("CPU threads must be between 1 and 8"))
	}

	// Memory validation
	if d.Memory.SizeMB < 512 || d.Memory.SizeMB > 1024*1024 { // 512MB to 1TB
		errors = append(errors, fmt.Errorf("memory size must be between 512MB and 1TB"))
	}

	// Storage validation
	if d.Storage.SizeBytes < 1024*1024*1024 { // 1GB minimum
		errors = append(errors, fmt.Errorf("storage size must be at least 1GB"))
	}

	// Display validation
	if d.Display.Width < 320 || d.Display.Width > 7680 {
		errors = append(errors, fmt.Errorf("display width must be between 320 and 7680"))
	}
	if d.Display.Height < 240 || d.Display.Height > 4320 {
		errors = append(errors, fmt.Errorf("display height must be between 240 and 4320"))
	}
	if d.Display.DPI < 72 || d.Display.DPI > 640 {
		errors = append(errors, fmt.Errorf("DPI must be between 72 and 640"))
	}

	// Graphics validation
	validDevices := []string{"virtio-gpu-pci", "virtio-gpu-gl-pci", "virtio-vga", "qxl"}
	valid := false
	for _, dev := range validDevices {
		if dev == d.Graphics.Device {
			valid = true
			break
		}
	}
	if !valid {
		errors = append(errors, fmt.Errorf("invalid graphics device: %s", d.Graphics.Device))
	}

	// Network validation
	validModes := []string{"user", "tap", "bridge", "none"}
	valid = false
	for _, mode := range validModes {
		if mode == d.Network.Mode {
			valid = true
			break
		}
	}
	if !valid {
		errors = append(errors, fmt.Errorf("invalid network mode: %s", d.Network.Mode))
	}

	return errors
}

// GetDefaultDevice returns a device with default configuration
func GetDefaultDevice(name string, hwInfo interface{}) *Device {
	now := time.Now()
	return &Device{
		ID:          uuid.New().String(),
		Name:        name,
		CreatedAt:   now,
		UpdatedAt:   now,
		Description: "",
		Tags:        []string{},
		Image: ImageConfig{
			Format:       "qcow2",
			Architecture: "x86_64",
			ReadOnly:     true,
		},
		CPU: CPUConfig{
			Architecture: "x86_64",
			Cores:        4,
			Threads:      1,
			Model:        "host",
			Topology:     "1,4,1",
		},
		Memory: MemoryConfig{
			SizeMB:        4096,
			EnableBalloon: false,
			HugePages:     false,
			MemoryBacking: "ram",
		},
		Storage: StorageConfig{
			SizeBytes:    8 * 1024 * 1024 * 1024, // 8GB
			Format:       "qcow2",
			CacheMode:    "writeback",
			Discard:      "unmap",
			DetectZeroes: "on",
			Interface:    "virtio",
			IOThread:     true,
		},
		Display: DisplayConfig{
			Width:         1280,
			Height:        720,
			DPI:           160,
			Scale:         1.0,
			Fullscreen:    false,
			VSync:         true,
			AspectRatio:   "16:9",
			Rotation:      0,
			Headless:      false,
			ShowCursor:    true,
			CaptureCursor: false,
			MultiMonitor:  false,
		},
		Graphics: GraphicsConfig{
			Device:      "virtio-gpu-pci",
			Renderer:    "auto",
			Enable3D:    true,
			EnableVirgl: true,
			VRAM:        256,
			EnableGlSl:  true,
		},
		Audio: AudioConfig{
			Enabled:      true,
			Device:       "pa",
			SampleRate:   48000,
			BufferSize:   1024,
			Channels:     2,
			InputDevice:  "",
			OutputDevice: "",
		},
		Network: NetworkConfig{
			Mode:           "user",
			DHCPStart:      "10.0.2.15",
			DHCPEnd:        "10.0.2.254",
			DNSServers:     []string{"8.8.8.8", "8.8.4.4"},
			PortForwards: []PortForward{
				{Protocol: "tcp", HostPort: 5555, GuestPort: 5555, GuestIP: ""},
			},
			EnableIPv6:     false,
			IsolateNetwork: false,
			MACAddress:     "",
		},
		Input: InputConfig{
			KeyboardLayout:   "en-us",
			MouseMode:        "relative",
			MouseSensitivity: 1.0,
			KeyMapping:       make(map[string]string),
			EnableGamepad:    true,
			GamepadMapping:   "",
		},
		Virtualization: VirtualizationConfig{
			Acceleration: "auto",
			MachineType:  "pc",
			BootOrder:    "c",
		},
		Advanced: AdvancedConfig{
			ExtraArgs:        []string{},
			EnableDebug:      false,
			GDBPort:          0,
			MonitorPort:      4444,
			SerialPort:       "stdio",
			EnableGuestAgent: true,
			BalloonMemory:    false,
			HugePages:        false,
			CPUPinning:       []int{},
			IOThread:         true,
			MemoryBacking:    "ram",
			SMBIOSType:       "default",
			ACPIEnabled:      true,
			HPETEnabled:      true,
			RTCEnabled:       true,
			USBEnabled:       false,
			USBDevices:       []string{},
			EnvVars:          make(map[string]string),
		},
	}
}

// ApplyPreset applies a performance preset to the device
func (d *Device) ApplyPreset(preset string, hwInfo interface{}) {
	switch preset {
	case "low":
		d.CPU.Cores = 2
		d.CPU.Threads = 1
		d.Memory.SizeMB = 2048
		d.Storage.SizeBytes = 4 * 1024 * 1024 * 1024
		d.Display.Width = 1024
		d.Display.Height = 600
		d.Display.DPI = 120
		d.Graphics.Enable3D = false
		d.Graphics.EnableVirgl = false
		d.Graphics.VRAM = 128
		d.Audio.Enabled = false
		d.Advanced.HugePages = false
		d.Advanced.IOThread = false

	case "balanced":
		d.CPU.Cores = 4
		d.CPU.Threads = 1
		d.Memory.SizeMB = 4096
		d.Storage.SizeBytes = 8 * 1024 * 1024 * 1024
		d.Display.Width = 1280
		d.Display.Height = 720
		d.Display.DPI = 160
		d.Graphics.Enable3D = true
		d.Graphics.EnableVirgl = true
		d.Graphics.VRAM = 256
		d.Audio.Enabled = true
		d.Advanced.IOThread = true

	case "performance":
		d.CPU.Cores = 8
		d.CPU.Threads = 1
		d.Memory.SizeMB = 8192
		d.Storage.SizeBytes = 16 * 1024 * 1024 * 1024
		d.Display.Width = 1920
		d.Display.Height = 1080
		d.Display.DPI = 240
		d.Graphics.Enable3D = true
		d.Graphics.EnableVirgl = true
		d.Graphics.VRAM = 512
		d.Audio.Enabled = true
		d.Advanced.HugePages = true
		d.Advanced.IOThread = true
		d.Advanced.CPUPinning = []int{0, 1, 2, 3, 4, 5, 6, 7}

	case "manual":
		// Keep current values
	}
}

// Export exports the device configuration to JSON
func (d *Device) Export() ([]byte, error) {
	return json.MarshalIndent(d, "", "  ")
}

// Import imports a device configuration from JSON
func Import(data []byte) (*Device, error) {
	var device Device
	if err := json.Unmarshal(data, &device); err != nil {
		return nil, err
	}
	return &device, nil
}

// GetConfigPath returns the path to the device config file
func (dm *DeviceManager) GetConfigPath(id string) string {
	return filepath.Join(dm.devicesDir, id+".json")
}

// Search searches devices by name or tags
func (dm *DeviceManager) Search(query string) []*Device {
	query = strings.ToLower(query)
	var results []*Device

	for _, d := range dm.devices {
		if strings.Contains(strings.ToLower(d.Name), query) {
			results = append(results, d)
			continue
		}
		for _, tag := range d.Tags {
			if strings.Contains(strings.ToLower(tag), query) {
				results = append(results, d)
				break
			}
		}
		if strings.Contains(strings.ToLower(d.Description), query) {
			results = append(results, d)
		}
	}

	return results
}

// GetRecent returns recently used devices
func (dm *DeviceManager) GetRecent(limit int) []*Device {
	devices := dm.GetAll()

	// Sort by last used
	sortDevices(devices)

	if limit > 0 && len(devices) > limit {
		return devices[:limit]
	}
	return devices
}

func sortDevices(devices []*Device) {
	// Simple bubble sort for now - can be optimized
	for i := 0; i < len(devices)-1; i++ {
		for j := 0; j < len(devices)-i-1; j++ {
			a := devices[j].LastUsedAt
			b := devices[j+1].LastUsedAt

			if a == nil && b == nil {
				continue
			}
			if a == nil {
				devices[j], devices[j+1] = devices[j+1], devices[j]
				continue
			}
			if b == nil {
				continue
			}
			if a.Before(*b) {
				devices[j], devices[j+1] = devices[j+1], devices[j]
			}
		}
	}
}

// DevicePreset represents a device preset
type DevicePreset struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Device      *Device `json:"device"`
}

// GetBuiltinPresets returns built-in device presets
func GetBuiltinPresets() []DevicePreset {
	return []DevicePreset{
		{
			Name:        "Phone (Portrait)",
			Description: "Standard phone form factor, portrait orientation",
			Device: &Device{
				Display: DisplayConfig{
					Width:       1080,
					Height:      1920,
					DPI:         420,
					AspectRatio: "9:16",
				},
			},
		},
		{
			Name:        "Phone (Landscape)",
			Description: "Standard phone form factor, landscape orientation",
			Device: &Device{
				Display: DisplayConfig{
					Width:       1920,
					Height:      1080,
					DPI:         420,
					AspectRatio: "16:9",
				},
			},
		},
		{
			Name:        "Tablet (Portrait)",
			Description: "Tablet form factor, portrait orientation",
			Device: &Device{
				Display: DisplayConfig{
					Width:       1600,
					Height:      2560,
					DPI:         280,
					AspectRatio: "5:8",
				},
			},
		},
		{
			Name:        "Tablet (Landscape)",
			Description: "Tablet form factor, landscape orientation",
			Device: &Device{
				Display: DisplayConfig{
					Width:       2560,
					Height:      1600,
					DPI:         280,
					AspectRatio: "8:5",
				},
			},
		},
		{
			Name:        "Desktop (720p)",
			Description: "Desktop-style 720p",
			Device: &Device{
				Display: DisplayConfig{
					Width:       1280,
					Height:      720,
					DPI:         160,
					AspectRatio: "16:9",
				},
			},
		},
		{
			Name:        "Desktop (1080p)",
			Description: "Desktop-style 1080p",
			Device: &Device{
				Display: DisplayConfig{
					Width:       1920,
					Height:      1080,
					DPI:         240,
					AspectRatio: "16:9",
				},
			},
		},
		{
			Name:        "Desktop (1440p)",
			Description: "Desktop-style 1440p",
			Device: &Device{
				Display: DisplayConfig{
					Width:       2560,
					Height:      1440,
					DPI:         320,
					AspectRatio: "16:9",
				},
			},
		},
		{
			Name:        "TV (4K)",
			Description: "TV-style 4K",
			Device: &Device{
				Display: DisplayConfig{
					Width:       3840,
					Height:      2160,
					DPI:         320,
					AspectRatio: "16:9",
				},
			},
		},
	}
}