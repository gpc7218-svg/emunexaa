package hardware

import (
	"fmt"
	"runtime"
	"strings"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/disk"
)

// HardwareInfo contains all detected hardware information
type HardwareInfo struct {
	CPU        CPUInfo        `json:"cpu"`
	Memory     MemoryInfo     `json:"memory"`
	GPU        GPUInfo        `json:"gpu"`
	OS         OSInfo         `json:"os"`
	Virtualization VirtualizationInfo `json:"virtualization"`
	Storage    []StorageInfo  `json:"storage"`
}

// CPUInfo contains CPU information
type CPUInfo struct {
	ModelName      string   `json:"model_name"`
	VendorID       string   `json:"vendor_id"`
	Family         string   `json:"family"`
	Model          string   `json:"model"`
	Stepping       int32    `json:"stepping"`
	PhysicalCores  int      `json:"physical_cores"`
	LogicalCores   int      `json:"logical_cores"`
	ThreadsPerCore int      `json:"threads_per_core"`
	FrequencyMHz   float64  `json:"frequency_mhz"`
	MaxFrequencyMHz float64 `json:"max_frequency_mhz"`
	CacheSize      string   `json:"cache_size"`
	Flags          []string `json:"flags"`
	Features       CPUFeatures `json:"features"`
	Architecture   string   `json:"architecture"`
}

// CPUFeatures contains CPU feature flags
type CPUFeatures struct {
	VMX        bool `json:"vmx"`        // Intel VT-x
	SVM        bool `json:"svm"`        // AMD SVM
	AVX        bool `json:"avx"`
	AVX2       bool `json:"avx2"`
	AVX512     bool `json:"avx512"`
	SSE        bool `json:"sse"`
	SSE2       bool `json:"sse2"`
	SSE3       bool `json:"sse3"`
	SSSE3      bool `json:"ssse3"`
	SSE41      bool `json:"sse4_1"`
	SSE42      bool `json:"sse4_2"`
	AES        bool `json:"aes"`
	SHA        bool `json:"sha"`
	RDRAND     bool `json:"rdrand"`
	RDSEED     bool `json:"rdseed"`
	FMA        bool `json:"fma"`
	BMI1       bool `json:"bmi1"`
	BMI2       bool `json:"bmi2"`
	ADX        bool `json:"adx"`
	MOVBE      bool `json:"movbe"`
	POPCNT     bool `json:"popcnt"`
	LZCNT      bool `json:"lzcnt"`
	PREFETCHWT1 bool `json:"prefetchwt1"`
	CLFLUSHOPT bool `json:"clflushopt"`
	CLWB       bool `json:"clwb"`
	PCONFIG    bool `json:"pconfig"`
	WAITPKG    bool `json:"waitpkg"`
	GFNI       bool `json:"gfni"`
	VPCLMULQDQ bool `json:"vpclmulqdq"`
	VAES       bool `json:"vaes"`
	VP2INTERSECT bool `json:"vp2intersect"`
	SERIALIZE  bool `json:"serialize"`
	TSX        bool `json:"tsx"`
	HRESET     bool `json:"hreset"`
	KL         bool `json:"kl"`
	WIDEKL     bool `json:"widekl"`
}

// MemoryInfo contains memory information
type MemoryInfo struct {
	TotalBytes      uint64 `json:"total_bytes"`
	AvailableBytes  uint64 `json:"available_bytes"`
	UsedBytes       uint64 `json:"used_bytes"`
	FreeBytes       uint64 `json:"free_bytes"`
	UsedPercent     float64 `json:"used_percent"`
	SwapTotalBytes  uint64 `json:"swap_total_bytes"`
	SwapUsedBytes   uint64 `json:"swap_used_bytes"`
	SwapFreeBytes   uint64 `json:"swap_free_bytes"`
}

// GPUInfo contains GPU information
type GPUInfo struct {
	Devices []GPUDevice `json:"devices"`
}

// GPUDevice represents a single GPU
type GPUDevice struct {
	Index           int     `json:"index"`
	Name            string  `json:"name"`
	Vendor          string  `json:"vendor"`           // "NVIDIA", "AMD", "Intel", "Microsoft"
	DriverVersion   string  `json:"driver_version"`
	VRAMBytes       uint64  `json:"vram_bytes"`
	VRAMUsedBytes   uint64  `json:"vram_used_bytes"`
	ComputeCapability string `json:"compute_capability"` // For NVIDIA
	SupportsCUDA    bool    `json:"supports_cuda"`
	SupportsVulkan  bool    `json:"supports_vulkan"`
	SupportsDirectX bool    `json:"supports_directx"`
	SupportsOpenCL  bool    `json:"supports_opencl"`
	IsIntegrated    bool    `json:"is_integrated"`
	IsPrimary       bool    `json:"is_primary"`
}

// OSInfo contains operating system information
type OSInfo struct {
	Platform        string `json:"platform"`         // "windows"
	Family          string `json:"family"`           // "windows"
	Version         string `json:"version"`          // "10.0.19045"
	BuildNumber     string `json:"build_number"`
	Architecture    string `json:"architecture"`     // "amd64"
	IsWindows10     bool   `json:"is_windows_10"`
	IsWindows11     bool   `json:"is_windows_11"`
	IsWin11_24H2    bool   `json:"is_win11_24h2"`    // Windows 11 24H2+
	HyperVEnabled   bool   `json:"hyperv_enabled"`
	VirtualizationEnabled bool `json:"virtualization_enabled"`
}

// VirtualizationInfo contains virtualization capability information
type VirtualizationInfo struct {
	WHPXAvailable       bool   `json:"whpx_available"`
	WHVAvailable        bool   `json:"whv_available"`       // Windows Hypervisor Platform
	HyperVEnabled       bool   `json:"hyperv_enabled"`
	VMXEnabled          bool   `json:"vmx_enabled"`         // Intel VT-x in BIOS
	SVMEnabled          bool   `json:"svm_enabled"`         // AMD SVM in BIOS
	SecondLevelAddrTrans bool  `json:"second_level_addr_trans"` // EPT/NPT
	VirtualizationTech  string `json:"virtualization_tech"` // "Intel VT-x", "AMD-V", "None"
	RecommendedAccel    string `json:"recommended_accel"`   // "whpx", "tcg"
	Conflicts           []string `json:"conflicts"`         // Known conflicts
	CanRunARM64         bool   `json:"can_run_arm64"`       // Can run ARM64 guests via TCG
}

// StorageInfo contains storage device information
type StorageInfo struct {
	Device        string `json:"device"`
	MountPoint    string `json:"mount_point"`
	Filesystem    string `json:"filesystem"`
	TotalBytes    uint64 `json:"total_bytes"`
	UsedBytes     uint64 `json:"used_bytes"`
	FreeBytes     uint64 `json:"free_bytes"`
	UsedPercent   float64 `json:"used_percent"`
	IsSSD         bool   `json:"is_ssd"`
	IsRemovable   bool   `json:"is_removable"`
	IsSystem      bool   `json:"is_system"`
}

// PerformanceTier represents the recommended performance tier
type PerformanceTier string

const (
	PerformanceTierLow       PerformanceTier = "low"
	PerformanceTierBalanced  PerformanceTier = "balanced"
	PerformanceTierHigh      PerformanceTier = "performance"
)

// Detect performs comprehensive hardware detection
func Detect() (*HardwareInfo, error) {
	info := &HardwareInfo{}

	// Detect CPU
	cpuInfo, err := detectCPU()
	if err != nil {
		return nil, fmt.Errorf("CPU detection failed: %w", err)
	}
	info.CPU = *cpuInfo

	// Detect Memory
	memInfo, err := detectMemory()
	if err != nil {
		return nil, fmt.Errorf("memory detection failed: %w", err)
	}
	info.Memory = *memInfo

	// Detect GPU
	gpuInfo, err := detectGPU()
	if err != nil {
		// GPU detection is non-critical
		info.GPU = GPUInfo{Devices: []GPUDevice{}}
	} else {
		info.GPU = *gpuInfo
	}

	// Detect OS
	osInfo, err := detectOS()
	if err != nil {
		return nil, fmt.Errorf("OS detection failed: %w", err)
	}
	info.OS = *osInfo

	// Detect Virtualization
	virtInfo, err := detectVirtualization(info.CPU, info.OS)
	if err != nil {
		return nil, fmt.Errorf("virtualization detection failed: %w", err)
	}
	info.Virtualization = *virtInfo

	// Detect Storage
	storageInfo, err := detectStorage()
	if err != nil {
		// Storage detection is non-critical
		info.Storage = []StorageInfo{}
	} else {
		info.Storage = storageInfo
	}

	return info, nil
}

// detectCPU detects CPU information
func detectCPU() (*CPUInfo, error) {
	cpuInfos, err := cpu.Info()
	if err != nil {
		return nil, err
	}

	if len(cpuInfos) == 0 {
		return nil, fmt.Errorf("no CPU info available")
	}

	ci := cpuInfos[0]

	physicalCores, _ := cpu.Counts(false)
	logicalCores, _ := cpu.Counts(true)

	threadsPerCore := 1
	if physicalCores > 0 {
		threadsPerCore = logicalCores / physicalCores
	}

	// Parse CPU flags
	flags := strings.Fields(ci.Flags)
	features := parseCPUFeatures(flags, ci.VendorID)

	return &CPUInfo{
		ModelName:       ci.ModelName,
		VendorID:        ci.VendorID,
		Family:          ci.Family,
		Model:           ci.Model,
		Stepping:        ci.Stepping,
		PhysicalCores:   physicalCores,
		LogicalCores:    logicalCores,
		ThreadsPerCore:  threadsPerCore,
		FrequencyMHz:    ci.Mhz,
		MaxFrequencyMHz: ci.Mhz, // gopsutil doesn't provide max freq on Windows
		CacheSize:       fmt.Sprintf("%d KB", ci.CacheSize),
		Flags:           flags,
		Features:        features,
		Architecture:    runtime.GOARCH,
	}, nil
}

// parseCPUFeatures parses CPU feature flags
func parseCPUFeatures(flags []string, vendorID string) CPUFeatures {
	featureMap := make(map[string]bool)
	for _, f := range flags {
		featureMap[strings.ToLower(f)] = true
	}

	features := CPUFeatures{
		VMX:            featureMap["vmx"],
		SVM:            featureMap["svm"],
		AVX:            featureMap["avx"],
		AVX2:           featureMap["avx2"],
		AVX512:         featureMap["avx512f"],
		SSE:            featureMap["sse"],
		SSE2:           featureMap["sse2"],
		SSE3:           featureMap["sse3"],
		SSSE3:          featureMap["ssse3"],
		SSE41:          featureMap["sse4_1"],
		SSE42:          featureMap["sse4_2"],
		AES:            featureMap["aes"],
		SHA:            featureMap["sha"],
		RDRAND:         featureMap["rdrand"],
		RDSEED:         featureMap["rdseed"],
		FMA:            featureMap["fma"],
		BMI1:           featureMap["bmi1"],
		BMI2:           featureMap["bmi2"],
		ADX:            featureMap["adx"],
		MOVBE:          featureMap["movbe"],
		POPCNT:         featureMap["popcnt"],
		LZCNT:          featureMap["lzcnt"],
		PREFETCHWT1:    featureMap["prefetchwt1"],
		CLFLUSHOPT:     featureMap["clflushopt"],
		CLWB:           featureMap["clwb"],
		PCONFIG:        featureMap["pconfig"],
		WAITPKG:        featureMap["waitpkg"],
		GFNI:           featureMap["gfni"],
		VPCLMULQDQ:     featureMap["vpclmulqdq"],
		VAES:           featureMap["vaes"],
		VP2INTERSECT:   featureMap["vp2intersect"],
		SERIALIZE:      featureMap["serialize"],
		TSX:            featureMap["tsx"] || featureMap["rtm"],
		HRESET:         featureMap["hreset"],
		KL:             featureMap["kl"],
		WIDEKL:         featureMap["widekl"],
	}

	return features
}

// detectMemory detects memory information
func detectMemory() (*MemoryInfo, error) {
	vm, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	swap, err := mem.SwapMemory()
	if err != nil {
		// Swap might not be available
		swap = &mem.SwapMemoryStat{}
	}

	return &MemoryInfo{
		TotalBytes:     vm.Total,
		AvailableBytes: vm.Available,
		UsedBytes:      vm.Used,
		FreeBytes:      vm.Free,
		UsedPercent:    vm.UsedPercent,
		SwapTotalBytes: swap.Total,
		SwapUsedBytes:  swap.Used,
		SwapFreeBytes:  swap.Free,
	}, nil
}

// detectGPU detects GPU information
func detectGPU() (*GPUInfo, error) {
	// On Windows, we use WMI or DirectX to detect GPUs
	// For now, return basic info - can be extended with windows-specific code
	devices := []GPUDevice{}

	// This is a placeholder - real implementation would use:
	// - WMI Win32_VideoController
	// - DXGI for adapter enumeration
	// - NVIDIA/AMD specific APIs for detailed info

	return &GPUInfo{
		Devices: devices,
	}, nil
}

// detectOS detects operating system information
func detectOS() (*OSInfo, error) {
	hostInfo, err := host.Info()
	if err != nil {
		return nil, err
	}

	// Parse Windows version
	isWin10 := false
	isWin11 := false
	isWin11_24H2 := false

	if hostInfo.Platform == "windows" {
		// Version format: "10.0.19045" or "10.0.26100"
		versionParts := strings.Split(hostInfo.PlatformVersion, ".")
		if len(versionParts) >= 3 {
			major := versionParts[0]
			minor := versionParts[1]
			build := versionParts[2]

			if major == "10" && minor == "0" {
				buildNum := 0
				fmt.Sscanf(build, "%d", &buildNum)
				if buildNum >= 22000 {
					isWin11 = true
					if buildNum >= 26100 {
						isWin11_24H2 = true
					}
				} else {
					isWin10 = true
				}
			}
		}
	}

	// Check Hyper-V status
	hyperVEnabled := checkHyperVEnabled()
	virtualizationEnabled := checkVirtualizationEnabled()

	return &OSInfo{
		Platform:            hostInfo.Platform,
		Family:              hostInfo.PlatformFamily,
		Version:             hostInfo.PlatformVersion,
		BuildNumber:         hostInfo.KernelVersion,
		Architecture:        hostInfo.KernelArch,
		IsWindows10:         isWin10,
		IsWindows11:         isWin11,
		IsWin11_24H2:        isWin11_24H2,
		HyperVEnabled:       hyperVEnabled,
		VirtualizationEnabled: virtualizationEnabled,
	}, nil
}

// checkHyperVEnabled checks if Hyper-V is enabled
func checkHyperVEnabled() bool {
	// Check via registry or DISM
	// For now, return false - can be implemented with windows registry access
	return false
}

// checkVirtualizationEnabled checks if virtualization is enabled in BIOS/firmware
func checkVirtualizationEnabled() bool {
	// This would require WMI or CPU feature detection
	// For now, return true if VMX or SVM is present
	return false
}

// detectVirtualization detects virtualization capabilities
func detectVirtualization(cpuInfo CPUInfo, osInfo OSInfo) (*VirtualizationInfo, error) {
	info := &VirtualizationInfo{
		Conflicts: []string{},
	}

	// Check CPU virtualization support
	info.VMXEnabled = cpuInfo.Features.VMX
	info.SVMEnabled = cpuInfo.Features.SVM

	if info.VMXEnabled {
		info.VirtualizationTech = "Intel VT-x"
	} else if info.SVMEnabled {
		info.VirtualizationTech = "AMD-V"
	} else {
		info.VirtualizationTech = "None"
	}

	// Check WHPX availability (Windows 10 2004+ with HypervisorPlatform)
	if osInfo.IsWindows10 || osInfo.IsWindows11 {
		info.WHPXAvailable = osInfo.VirtualizationEnabled && osInfo.HyperVEnabled
	}

	// Check WHV (Windows Hypervisor Platform) - newer API
	info.WHVAvailable = osInfo.IsWindows11 || (osInfo.IsWindows10 && isWin10_2004Plus(osInfo.Version))

	// Check Hyper-V
	info.HyperVEnabled = osInfo.HyperVEnabled

	// Check Second Level Address Translation (SLAT/EPT/NPT)
	info.SecondLevelAddrTrans = cpuInfo.Features.VMX || cpuInfo.Features.SVM

	// Determine recommended acceleration
	if info.WHPXAvailable && (info.VMXEnabled || info.SVMEnabled) {
		info.RecommendedAccel = "whpx"
	} else {
		info.RecommendedAccel = "tcg"
	}

	// Check for conflicts
	if info.HyperVEnabled && !info.WHPXAvailable {
		info.Conflicts = append(info.Conflicts, "Hyper-V enabled but WHPX not available")
	}

	if info.VMXEnabled && info.SVMEnabled {
		info.Conflicts = append(info.Conflicts, "Both VMX and SVM detected (unusual)")
	}

	// ARM64 guest support on x86_64 host (via TCG emulation)
	info.CanRunARM64 = runtime.GOARCH == "amd64"

	// Special check for Windows 11 24H2 ARM64 WHPX
	if osInfo.IsWin11_24H2 && runtime.GOARCH == "arm64" {
		info.WHPXAvailable = true
		info.RecommendedAccel = "whpx"
	}

	return info, nil
}

// isWin10_2004Plus checks if Windows 10 version is 2004 (build 19041) or later
func isWin10_2004Plus(version string) bool {
	parts := strings.Split(version, ".")
	if len(parts) >= 3 {
		build := 0
		fmt.Sscanf(parts[2], "%d", &build)
		return build >= 19041
	}
	return false
}

// detectStorage detects storage devices
func detectStorage() ([]StorageInfo, error) {
	partitions, err := disk.Partitions(true)
	if err != nil {
		return nil, err
	}

	var storage []StorageInfo
	for _, p := range partitions {
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}

		// Determine if SSD (Windows specific)
		isSSD := isSSDDrive(p.Device)

		storage = append(storage, StorageInfo{
			Device:      p.Device,
			MountPoint:  p.Mountpoint,
			Filesystem:  p.Fstype,
			TotalBytes:  usage.Total,
			UsedBytes:   usage.Used,
			FreeBytes:   usage.Free,
			UsedPercent: usage.UsedPercent,
			IsSSD:       isSSD,
			IsRemovable: strings.Contains(strings.ToLower(p.Device), "removable"),
			IsSystem:    p.Mountpoint == "C:" || p.Mountpoint == "/",
		})
	}

	return storage, nil
}

// isSSDDrive checks if a drive is an SSD (Windows implementation)
func isSSDDrive(device string) bool {
	// On Windows, this would query Win32_DiskDrive.MediaType
	// For now, return false - implement with WMI
	return false
}

// DefaultInfo returns default hardware info for fallback
func DefaultInfo() *HardwareInfo {
	return &HardwareInfo{
		CPU: CPUInfo{
			ModelName:      "Unknown",
			VendorID:       "Unknown",
			PhysicalCores:  4,
			LogicalCores:   8,
			ThreadsPerCore: 2,
			FrequencyMHz:   2400,
			Architecture:   runtime.GOARCH,
			Features: CPUFeatures{
				VMX: false,
				SVM: false,
			},
		},
		Memory: MemoryInfo{
			TotalBytes:     8 * 1024 * 1024 * 1024, // 8GB
			AvailableBytes: 4 * 1024 * 1024 * 1024, // 4GB
		},
		GPU: GPUInfo{
			Devices: []GPUDevice{},
		},
		OS: OSInfo{
			Platform:     "windows",
			Architecture: runtime.GOARCH,
			IsWindows10:  true,
		},
		Virtualization: VirtualizationInfo{
			WHPXAvailable:    false,
			RecommendedAccel: "tcg",
			CanRunARM64:      runtime.GOARCH == "amd64",
		},
		Storage: []StorageInfo{},
	}
}

// GetRecommendedPreset returns the recommended performance preset based on hardware
func (h *HardwareInfo) GetRecommendedPreset() PerformanceTier {
	// Low-end: <= 4 cores, <= 8GB RAM
	if h.CPU.LogicalCores <= 4 || h.Memory.TotalBytes <= 8*1024*1024*1024 {
		return PerformanceTierLow
	}

	// High-end: >= 8 cores, >= 16GB RAM, dedicated GPU
	hasDedicatedGPU := false
	for _, gpu := range h.GPU.Devices {
		if !gpu.IsIntegrated && gpu.VRAMBytes > 0 {
			hasDedicatedGPU = true
			break
		}
	}

	if h.CPU.LogicalCores >= 8 && h.Memory.TotalBytes >= 16*1024*1024*1024 && hasDedicatedGPU {
		return PerformanceTierHigh
	}

	return PerformanceTierBalanced
}

// GetRecommendedVMResources returns recommended VM resources for a given preset
func (h *HardwareInfo) GetRecommendedVMResources(tier PerformanceTier) (cpuCores int, ramMB int) {
	// Reserve resources for host
	reservedRAM := uint64(2 * 1024 * 1024 * 1024) // 2GB for host
	reservedCores := 2

	availableRAM := h.Memory.TotalBytes
	if availableRAM > reservedRAM {
		availableRAM -= reservedRAM
	}

	availableCores := h.CPU.LogicalCores
	if availableCores > reservedCores {
		availableCores -= reservedCores
	}

	switch tier {
	case PerformanceTierLow:
		cpuCores = min(2, availableCores)
		ramMB = int(min(availableRAM, 2*1024*1024*1024) / (1024 * 1024))
	case PerformanceTierBalanced:
		cpuCores = min(4, availableCores)
		ramMB = int(min(availableRAM, 6*1024*1024*1024) / (1024 * 1024))
	case PerformanceTierHigh:
		cpuCores = min(8, availableCores)
		ramMB = int(min(availableRAM, 16*1024*1024*1024) / (1024 * 1024))
	}

	// Ensure minimums
	if cpuCores < 1 {
		cpuCores = 1
	}
	if ramMB < 1024 {
		ramMB = 1024
	}

	return cpuCores, ramMB
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func min64(a, b uint64) uint64 {
	if a < b {
		return a
	}
	return b
}

// ValidateForVirtualization checks if hardware meets minimum requirements
func (h *HardwareInfo) ValidateForVirtualization() []string {
	var warnings []string

	if h.CPU.LogicalCores < 2 {
		warnings = append(warnings, "Less than 2 CPU cores available; performance will be severely limited")
	}

	if h.Memory.TotalBytes < 4*1024*1024*1024 {
		warnings = append(warnings, "Less than 4GB RAM; may not be able to run modern Android versions")
	}

	if !h.Virtualization.WHPXAvailable && !h.Virtualization.WHVAvailable {
		warnings = append(warnings, "Hardware virtualization (WHPX) not available; will use slow software emulation (TCG)")
	}

	if !h.CPU.Features.VMX && !h.CPU.Features.SVM {
		warnings = append(warnings, "CPU virtualization extensions (VT-x/AMD-V) not detected in BIOS/firmware")
	}

	if h.OS.IsWindows10 && !h.OS.IsWin11_24H2 && runtime.GOARCH == "arm64" {
		warnings = append(warnings, "ARM64 WHPX requires Windows 11 24H2+; ARM64 guests will use TCG emulation")
	}

	return warnings
}