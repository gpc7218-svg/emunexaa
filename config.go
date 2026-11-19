package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"

	"github.com/mitchellh/go-homedir"
	"gopkg.in/yaml.v3"
)

// ConfigVersion is the current configuration schema version
const ConfigVersion = 1

// Config represents the complete application configuration
type Config struct {
	Version          int                    `json:"version" yaml:"version"`
	Virtualization   VirtualizationConfig   `json:"virtualization" yaml:"virtualization"`
	Graphics         GraphicsConfig         `json:"graphics" yaml:"graphics"`
	Display          DisplayConfig          `json:"display" yaml:"display"`
	Audio            AudioConfig            `json:"audio" yaml:"audio"`
	Network          NetworkConfig          `json:"network" yaml:"network"`
	Storage          StorageConfig          `json:"storage" yaml:"storage"`
	Input            InputConfig            `json:"input" yaml:"input"`
	Downloads        DownloadsConfig        `json:"downloads" yaml:"downloads"`
	Language         LanguageConfig         `json:"language" yaml:"language"`
	Appearance       AppearanceConfig       `json:"appearance" yaml:"appearance"`
	Advanced         AdvancedConfig         `json:"advanced" yaml:"advanced"`
	Diagnostics      DiagnosticsConfig      `json:"diagnostics" yaml:"diagnostics"`
}

// VirtualizationConfig holds virtualization engine settings
type VirtualizationConfig struct {
	Engine           string `json:"engine" yaml:"engine"`                     // "qemu"
	QEMUPath         string `json:"qemu_path" yaml:"qemu_path"`               // Custom QEMU binary path
	Acceleration     string `json:"acceleration" yaml:"acceleration"`         // "whpx", "tcg", "auto"
	EnableHyperV     bool   `json:"enable_hyperv" yaml:"enable_hyperv"`       // Enable Hyper-V features
	DefaultCPUArch   string `json:"default_cpu_arch" yaml:"default_cpu_arch"` // "x86_64", "arm64"
	DefaultMachine   string `json:"default_machine" yaml:"default_machine"`   // "pc", "virt"
	EnableKVM        bool   `json:"enable_kvm" yaml:"enable_kvm"`             // Not applicable on Windows
	CPUModel         string `json:"cpu_model" yaml:"cpu_model"`               // "host", "max", specific model
	EnableNestedVirt bool   `json:"enable_nested_virt" yaml:"enable_nested_virt"`
}

// GraphicsConfig holds graphics/display device settings
type GraphicsConfig struct {
	Device          string `json:"device" yaml:"device"`                 // "virtio-gpu-pci", "virtio-gpu-gl-pci", "virtio-vga", "qxl"
	Renderer        string `json:"renderer" yaml:"renderer"`             // "auto", "virgl", "venus", "software"
	Enable3D        bool   `json:"enable_3d" yaml:"enable_3d"`           // Enable 3D acceleration
	EnableVirgl     bool   `json:"enable_virgl" yaml:"enable_virgl"`     // Enable Virgil3D
	VirglRenderer   string `json:"virgl_renderer" yaml:"virgl_renderer"` // Path to virglrenderer
	GPUDevice       string `json:"gpu_device" yaml:"gpu_device"`         // Host GPU device for passthrough
	VRAM            int    `json:"vram" yaml:"vram"`                     // VRAM in MB
	EnableGlSl      bool   `json:"enable_glsl" yaml:"enable_glsl"`       // Enable GLSL
}

// DisplayConfig holds display/window settings
type DisplayConfig struct {
	Width          int     `json:"width" yaml:"width"`
	Height         int     `json:"height" yaml:"height"`
	DPI            int     `json:"dpi" yaml:"dpi"`
	Scale          float64 `json:"scale" yaml:"scale"`
	Fullscreen     bool    `json:"fullscreen" yaml:"fullscreen"`
	VSync          bool    `json:"vsync" yaml:"vsync"`
	AspectRatio    string  `json:"aspect_ratio" yaml:"aspect_ratio"` // "16:9", "4:3", "free"
	Rotation       int     `json:"rotation" yaml:"rotation"`         // 0, 90, 180, 270
	ShowCursor     bool    `json:"show_cursor" yaml:"show_cursor"`
	CaptureCursor  bool    `json:"capture_cursor" yaml:"capture_cursor"`
	MultiMonitor   bool    `json:"multi_monitor" yaml:"multi_monitor"`
}

// AudioConfig holds audio settings
type AudioConfig struct {
	Enabled       bool   `json:"enabled" yaml:"enabled"`
	Device        string `json:"device" yaml:"device"`               // "pa", "spice", "none"
	SampleRate    int    `json:"sample_rate" yaml:"sample_rate"`     // 44100, 48000
	BufferSize    int    `json:"buffer_size" yaml:"buffer_size"`     // Buffer size in frames
	Channels      int    `json:"channels" yaml:"channels"`           // 1, 2
	InputDevice   string `json:"input_device" yaml:"input_device"`   // Microphone input
	OutputDevice  string `json:"output_device" yaml:"output_device"` // Speaker output
}

// NetworkConfig holds network settings
type NetworkConfig struct {
	Mode           string   `json:"mode" yaml:"mode"`                     // "user", "tap", "bridge", "none"
	HostIP         string   `json:"host_ip" yaml:"host_ip"`
	DHCPStart      string   `json:"dhcp_start" yaml:"dhcp_start"`
	DHCPEnd        string   `json:"dhcp_end" yaml:"dhcp_end"`
	DNSServers     []string `json:"dns_servers" yaml:"dns_servers"`
	PortForwards   []PortForward `json:"port_forwards" yaml:"port_forwards"`
	EnableIPv6     bool     `json:"enable_ipv6" yaml:"enable_ipv6"`
	IsolateNetwork bool     `json:"isolate_network" yaml:"isolate_network"`
}

// PortForward represents a port forwarding rule
type PortForward struct {
	Protocol string `json:"protocol" yaml:"protocol"` // "tcp", "udp"
	HostPort int    `json:"host_port" yaml:"host_port"`
	GuestPort int   `json:"guest_port" yaml:"guest_port"`
	GuestIP  string `json:"guest_ip" yaml:"guest_ip"`
}

// StorageConfig holds storage settings
type StorageConfig struct {
	DefaultSize      int64  `json:"default_size" yaml:"default_size"`           // Default disk size in bytes
	Format           string `json:"format" yaml:"format"`                       // "qcow2", "raw"
	CacheMode        string `json:"cache_mode" yaml:"cache_mode"`               // "writeback", "writethrough", "none", "directsync", "unsafe"
	Discard          string `json:"discard" yaml:"discard"`                     // "unmap", "ignore"
	DetectZeroes     string `json:"detect_zeroes" yaml:"detect_zeroes"`         // "on", "off", "unmap"
	ImageDirectory   string `json:"image_directory" yaml:"image_directory"`     // Where to store images
	WorkingDirectory string `json:"working_directory" yaml:"working_directory"` // Working directory for VMs
	EnableSnapshots  bool   `json:"enable_snapshots" yaml:"enable_snapshots"`
	AutoCompact      bool   `json:"auto_compact" yaml:"auto_compact"`
}

// InputConfig holds keyboard/mouse settings
type InputConfig struct {
	KeyboardLayout string `json:"keyboard_layout" yaml:"keyboard_layout"` // "en-us", "ar", etc.
	MouseMode      string `json:"mouse_mode" yaml:"mouse_mode"`           // "relative", "absolute"
	MouseSensitivity float64 `json:"mouse_sensitivity" yaml:"mouse_sensitivity"`
	KeyMapping     map[string]string `json:"key_mapping" yaml:"key_mapping"` // Custom key mappings
	EnableGamepad  bool   `json:"enable_gamepad" yaml:"enable_gamepad"`
	GamepadMapping string `json:"gamepad_mapping" yaml:"gamepad_mapping"`
}

// DownloadsConfig holds download manager settings
type DownloadsConfig struct {
	DownloadDirectory string   `json:"download_directory" yaml:"download_directory"`
	MirrorURLs        []string `json:"mirror_urls" yaml:"mirror_urls"`
	VerifyHashes      bool     `json:"verify_hashes" yaml:"verify_hashes"`
	VerifySignatures  bool     `json:"verify_signatures" yaml:"verify_signatures"`
	MaxConcurrent     int      `json:"max_concurrent" yaml:"max_concurrent"`
	ResumeEnabled     bool     `json:"resume_enabled" yaml:"resume_enabled"`
	TimeoutSeconds    int      `json:"timeout_seconds" yaml:"timeout_seconds"`
	ProxyURL          string   `json:"proxy_url" yaml:"proxy_url"`
}

// LanguageConfig holds language/locale settings
type LanguageConfig struct {
	Language    string `json:"language" yaml:"language"`       // "en", "ar"
	AutoDetect  bool   `json:"auto_detect" yaml:"auto_detect"` // Detect from system
	RTL         bool   `json:"rtl" yaml:"rtl"`                 // Right-to-left layout
	DateFormat  string `json:"date_format" yaml:"date_format"`
	TimeFormat  string `json:"time_format" yaml:"time_format"`
}

// AppearanceConfig holds UI appearance settings
type AppearanceConfig struct {
	Theme           string  `json:"theme" yaml:"theme"`                 // "dark", "light", "system"
	AccentColor     string  `json:"accent_color" yaml:"accent_color"`   // Hex color
	FontFamily      string  `json:"font_family" yaml:"font_family"`     // Font family
	FontSize        int     `json:"font_size" yaml:"font_size"`         // Base font size
	Animations      bool    `json:"animations" yaml:"animations"`       // Enable animations
	CompactMode     bool    `json:"compact_mode" yaml:"compact_mode"`   // Compact UI density
	ShowTooltips    bool    `json:"show_tooltips" yaml:"show_tooltips"` // Show tooltips
	HighContrast    bool    `json:"high_contrast" yaml:"high_contrast"` // High contrast mode
}

// AdvancedConfig holds advanced/expert settings
type AdvancedConfig struct {
	QEMUArgs           []string `json:"qemu_args" yaml:"qemu_args"`                     // Additional QEMU arguments
	KernelPath         string   `json:"kernel_path" yaml:"kernel_path"`                 // Custom kernel path
	InitrdPath         string   `json:"initrd_path" yaml:"initrd_path"`                 // Custom initrd path
	BootOrder          string   `json:"boot_order" yaml:"boot_order"`                   // "c", "d", "n"
	EnableDebug        bool     `json:"enable_debug" yaml:"enable_debug"`               // Enable debug logging
	DebugLogFile       string   `json:"debug_log_file" yaml:"debug_log_file"`           // Debug log file path
	GDBPort            int      `json:"gdb_port" yaml:"gdb_port"`                       // GDB stub port
	MonitorPort        int      `json:"monitor_port" yaml:"monitor_port"`               // QEMU monitor port
	SerialPort         string   `json:"serial_port" yaml:"serial_port"`                 // Serial output
	EnableGuestAgent   bool     `json:"enable_guest_agent" yaml:"enable_guest_agent"`   // QEMU guest agent
	BalloonMemory      bool     `json:"balloon_memory" yaml:"balloon_memory"`           // Memory ballooning
	HugePages          bool     `json:"huge_pages" yaml:"huge_pages"`                   // Use huge pages
	CPUPinning         []int    `json:"cpu_pinning" yaml:"cpu_pinning"`                 // CPU core pinning
	IOThread           bool     `json:"io_thread" yaml:"io_thread"`                     // IO thread for disks
	MemoryBacking      string   `json:"memory_backing" yaml:"memory_backing"`           // "ram", "hugepages", "file"
	SMBIOSType         string   `json:"smbios_type" yaml:"smbios_type"`                 // SMBIOS type
	ACPIEnabled        bool     `json:"acpi_enabled" yaml:"acpi_enabled"`               // ACPI
	HPETEnabled        bool     `json:"hpet_enabled" yaml:"hpet_enabled"`               // HPET timer
	RTCEnabled         bool     `json:"rtc_enabled" yaml:"rtc_enabled"`                 // RTC
	USBEnabled         bool     `json:"usb_enabled" yaml:"usb_enabled"`                 // USB passthrough
	USBDevices         []string `json:"usb_devices" yaml:"usb_devices"`                 // USB device filters
}

// DiagnosticsConfig holds diagnostics/logging settings
type DiagnosticsConfig struct {
	LogLevel           string `json:"log_level" yaml:"log_level"`                     // "debug", "info", "warn", "error"
	LogToFile          bool   `json:"log_to_file" yaml:"log_to_file"`
	LogFilePath        string `json:"log_file_path" yaml:"log_file_path"`
	MaxLogSize         int64  `json:"max_log_size" yaml:"max_log_size"`               // Max log file size in bytes
	MaxLogFiles        int    `json:"max_log_files" yaml:"max_log_files"`             // Number of rotated log files
	EnableCrashReports bool   `json:"enable_crash_reports" yaml:"enable_crash_reports"`
	CrashReportDir     string `json:"crash_report_dir" yaml:"crash_report_dir"`
	EnableTelemetry    bool   `json:"enable_telemetry" yaml:"enable_telemetry"`       // Anonymous usage stats
	TelemetryEndpoint  string `json:"telemetry_endpoint" yaml:"telemetry_endpoint"`
}

// DefaultConfig returns a configuration with sensible defaults
func DefaultConfig() *Config {
	homeDir, _ := homedir.Dir()
	baseDir := filepath.Join(homeDir, "EmuNexa")

	return &Config{
		Version: ConfigVersion,
		Virtualization: VirtualizationConfig{
			Engine:         "qemu",
			Acceleration:   "auto",
			DefaultCPUArch: "x86_64",
			DefaultMachine: "pc",
			CPUModel:       "host",
		},
		Graphics: GraphicsConfig{
			Device:        "virtio-gpu-pci",
			Renderer:      "auto",
			Enable3D:      true,
			EnableVirgl:   true,
			VRAM:          256,
			EnableGlSl:    true,
		},
		Display: DisplayConfig{
			Width:       1280,
			Height:      720,
			DPI:         160,
			Scale:       1.0,
			Fullscreen:  false,
			VSync:       true,
			AspectRatio: "16:9",
			Rotation:    0,
			ShowCursor:  true,
			CaptureCursor: false,
		},
		Audio: AudioConfig{
			Enabled:    true,
			Device:     "pa",
			SampleRate: 48000,
			BufferSize: 1024,
			Channels:   2,
		},
		Network: NetworkConfig{
			Mode:         "user",
			DHCPStart:    "10.0.2.15",
			DHCPEnd:      "10.0.2.254",
			DNSServers:   []string{"8.8.8.8", "8.8.4.4"},
			PortForwards: []PortForward{
				{Protocol: "tcp", HostPort: 5555, GuestPort: 5555, GuestIP: ""}, // ADB
			},
			EnableIPv6:     false,
			IsolateNetwork: false,
		},
		Storage: StorageConfig{
			DefaultSize:      8 * 1024 * 1024 * 1024, // 8GB
			Format:           "qcow2",
			CacheMode:        "writeback",
			Discard:          "unmap",
			DetectZeroes:     "on",
			ImageDirectory:   filepath.Join(baseDir, "images"),
			WorkingDirectory: filepath.Join(baseDir, "vms"),
			EnableSnapshots:  true,
			AutoCompact:      true,
		},
		Input: InputConfig{
			KeyboardLayout:   "en-us",
			MouseMode:        "relative",
			MouseSensitivity: 1.0,
			KeyMapping:       make(map[string]string),
			EnableGamepad:    true,
		},
		Downloads: DownloadsConfig{
			DownloadDirectory: filepath.Join(baseDir, "downloads"),
			MirrorURLs:        []string{"https://download.qemu.org/"},
			VerifyHashes:      true,
			VerifySignatures:  true,
			MaxConcurrent:     2,
			ResumeEnabled:     true,
			TimeoutSeconds:    300,
		},
		Language: LanguageConfig{
			Language:   "en",
			AutoDetect: true,
			RTL:        false,
			DateFormat: "YYYY-MM-DD",
			TimeFormat: "HH:mm:ss",
		},
		Appearance: AppearanceConfig{
			Theme:        "dark",
			AccentColor:  "#00D4AA", // EmuNexa teal
			FontFamily:   "Inter, system-ui, sans-serif",
			FontSize:     14,
			Animations:   true,
			CompactMode:  false,
			ShowTooltips: true,
			HighContrast: false,
		},
		Advanced: AdvancedConfig{
			QEMUArgs:         []string{},
			BootOrder:        "c",
			EnableDebug:      false,
			GDBPort:          0,
			MonitorPort:      4444,
			SerialPort:       "stdio",
			EnableGuestAgent: true,
			BalloonMemory:    false,
			HugePages:        false,
			IOThread:         true,
			MemoryBacking:    "ram",
			SMBIOSType:       "default",
			ACPIEnabled:      true,
			HPETEnabled:      true,
			RTCEnabled:       true,
			USBEnabled:       false,
			USBDevices:       []string{},
		},
		Diagnostics: DiagnosticsConfig{
			LogLevel:           "info",
			LogToFile:          true,
			LogFilePath:        filepath.Join(baseDir, "logs", "emunexa.log"),
			MaxLogSize:         10 * 1024 * 1024, // 10MB
			MaxLogFiles:        5,
			EnableCrashReports: true,
			CrashReportDir:     filepath.Join(baseDir, "crash_reports"),
			EnableTelemetry:    false,
		},
	}
}

// ConfigPath returns the path to the configuration file
func ConfigPath() (string, error) {
	homeDir, err := homedir.Dir()
	if err != nil {
		return "", err
	}

	configDir := filepath.Join(homeDir, "EmuNexa", "config")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return "", err
	}

	return filepath.Join(configDir, "config.yaml"), nil
}

// Load loads the configuration from disk, creating defaults if needed
func Load() (*Config, error) {
	path, err := ConfigPath()
	if err != nil {
		return nil, err
	}

	// If config doesn't exist, create default
	if _, err := os.Stat(path); os.IsNotExist(err) {
		cfg := DefaultConfig()
		if err := Save(cfg); err != nil {
			return nil, err
		}
		return cfg, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		// Try JSON as fallback
		if err := json.Unmarshal(data, &cfg); err != nil {
			return nil, err
		}
	}

	// Migration from older versions
	if cfg.Version < ConfigVersion {
		cfg = migrate(cfg)
		cfg.Version = ConfigVersion
		if err := Save(cfg); err != nil {
			return nil, err
		}
	}

	// Ensure required directories exist
	ensureDirectories(cfg)

	return &cfg, nil
}

// Save saves the configuration to disk
func Save(cfg *Config) error {
	path, err := ConfigPath()
	if err != nil {
		return err
	}

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

// ensureDirectories creates all required directories
func ensureDirectories(cfg *Config) {
	dirs := []string{
		cfg.Storage.ImageDirectory,
		cfg.Storage.WorkingDirectory,
		cfg.Downloads.DownloadDirectory,
		filepath.Dir(cfg.Diagnostics.LogFilePath),
		cfg.Diagnostics.CrashReportDir,
	}

	for _, dir := range dirs {
		if dir != "" {
			os.MkdirAll(dir, 0755)
		}
	}
}

// migrate migrates configuration from older versions
func migrate(cfg Config) Config {
	// Add migration logic here when config version changes
	return cfg
}

// GetPerformancePreset returns a configuration preset for the given performance tier
func GetPerformancePreset(tier string) *Config {
	cfg := DefaultConfig()

	switch tier {
	case "low":
		cfg.Virtualization.DefaultCPUArch = "x86_64"
		// These will be applied to device profiles, not global config
	case "balanced":
	case "performance":
	}

	return cfg
}

// Validate validates the configuration and returns any errors
func (c *Config) Validate() []error {
	var errors []error

	// Validate virtualization
	if c.Virtualization.Engine != "qemu" {
		errors = append(errors, ErrInvalidEngine)
	}

	if c.Virtualization.Acceleration != "auto" &&
	   c.Virtualization.Acceleration != "whpx" &&
	   c.Virtualization.Acceleration != "tcg" {
		errors = append(errors, ErrInvalidAcceleration)
	}

	// Validate graphics
	validDevices := []string{"virtio-gpu-pci", "virtio-gpu-gl-pci", "virtio-vga", "qxl"}
	if !contains(validDevices, c.Graphics.Device) {
		errors = append(errors, ErrInvalidGraphicsDevice)
	}

	// Validate display
	if c.Display.Width < 320 || c.Display.Width > 7680 {
		errors = append(errors, ErrInvalidDisplayWidth)
	}
	if c.Display.Height < 240 || c.Display.Height > 4320 {
		errors = append(errors, ErrInvalidDisplayHeight)
	}
	if c.Display.DPI < 72 || c.Display.DPI > 640 {
		errors = append(errors, ErrInvalidDPI)
	}

	// Validate storage
	if c.Storage.DefaultSize < 1024*1024*1024 { // Min 1GB
		errors = append(errors, ErrInvalidStorageSize)
	}

	// Validate network
	validNetworkModes := []string{"user", "tap", "bridge", "none"}
	if !contains(validNetworkModes, c.Network.Mode) {
		errors = append(errors, ErrInvalidNetworkMode)
	}

	return errors
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Configuration validation errors
var (
	ErrInvalidEngine           = &ConfigError{Field: "virtualization.engine", Message: "invalid virtualization engine"}
	ErrInvalidAcceleration     = &ConfigError{Field: "virtualization.acceleration", Message: "invalid acceleration mode"}
	ErrInvalidGraphicsDevice   = &ConfigError{Field: "graphics.device", Message: "invalid graphics device"}
	ErrInvalidDisplayWidth     = &ConfigError{Field: "display.width", Message: "display width out of range (320-7680)"}
	ErrInvalidDisplayHeight    = &ConfigError{Field: "display.height", Message: "display height out of range (240-4320)"}
	ErrInvalidDPI              = &ConfigError{Field: "display.dpi", Message: "DPI out of range (72-640)"}
	ErrInvalidStorageSize      = &ConfigError{Field: "storage.default_size", Message: "storage size too small (minimum 1GB)"}
	ErrInvalidNetworkMode      = &ConfigError{Field: "network.mode", Message: "invalid network mode"}
)

type ConfigError struct {
	Field   string
	Message string
}

func (e *ConfigError) Error() string {
	return e.Field + ": " + e.Message
}

// Runtime-specific defaults
func init() {
	// Windows-specific defaults
	if runtime.GOOS == "windows" {
		// Windows defaults are already set in DefaultConfig
	}
}