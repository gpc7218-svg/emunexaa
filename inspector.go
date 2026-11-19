package image

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ImageFormat represents the format of an image file
type ImageFormat string

const (
	FormatUnknown ImageFormat = "unknown"
	FormatRAW     ImageFormat = "raw"
	FormatQCOW2   ImageFormat = "qcow2"
	FormatISO     ImageFormat = "iso"
	FormatVMDK    ImageFormat = "vmdk"
	FormatVDI     ImageFormat = "vdi"
	FormatVHD     ImageFormat = "vhd"
	FormatVHDX    ImageFormat = "vhdx"
	FormatIMG     ImageFormat = "img"
	FormatZIP     ImageFormat = "zip"
	FormatGZIP    ImageFormat = "gz"
	FormatXZ      ImageFormat = "xz"
)

// Architecture represents the CPU architecture
type Architecture string

const (
	ArchUnknown Architecture = "unknown"
	ArchX86     Architecture = "x86"
	ArchX86_64  Architecture = "x86_64"
	ArchARM     Architecture = "arm"
	ArchARM64   Architecture = "arm64"
	ArchRISCV64 Architecture = "riscv64"
)

// CompatibilityLevel represents the compatibility classification
type CompatibilityLevel string

const (
	CompatFull          CompatibilityLevel = "full"           // Fully supported, boots out of the box
	CompatConfig        CompatibilityLevel = "config"         // Supported with additional configuration
	CompatExperimental  CompatibilityLevel = "experimental"   // Experimental, may have issues
	CompatIncompatible  CompatibilityLevel = "incompatible"   // Incompatible or missing components
)

// PartitionType represents a partition type
type PartitionType string

const (
	PartUnknown   PartitionType = "unknown"
	PartBoot      PartitionType = "boot"
	PartSystem    PartitionType = "system"
	PartVendor    PartitionType = "vendor"
	PartProduct   PartitionType = "product"
	PartODM       PartitionType = "odm"
	PartData      PartitionType = "data"
	PartRecovery  PartitionType = "recovery"
	PartDTB       PartitionType = "dtb"
	PartVBMeta    PartitionType = "vbmeta"
	PartSuper     PartitionType = "super"
	PartEFI       PartitionType = "efi"
	PartKernel    PartitionType = "kernel"
	PartRamdisk   PartitionType = "ramdisk"
)

// PartitionInfo represents a partition in an image
type PartitionInfo struct {
	Name       string         `json:"name"`
	Type       PartitionType  `json:"type"`
	StartSector uint64        `json:"start_sector"`
	NumSectors  uint64        `json:"num_sectors"`
	SizeBytes   uint64        `json:"size_bytes"`
	Filesystem string         `json:"filesystem"`
	MountPoint string         `json:"mount_point"`
	IsBootable  bool          `json:"is_bootable"`
	GUID        string         `json:"guid"`
}

// InspectionResult represents the result of image inspection
type InspectionResult struct {
	Path              string            `json:"path"`
	Format            ImageFormat       `json:"format"`
	Architecture      Architecture      `json:"architecture"`
	SizeBytes         uint64            `json:"size_bytes"`
	Partitions        []PartitionInfo   `json:"partitions"`
	HasBootloader     bool              `json:"has_bootloader"`
	HasKernel         bool              `json:"has_kernel"`
	HasInitramfs      bool              `json:"has_initramfs"`
	HasSystemPartition bool             `json:"has_system_partition"`
	HasVendorPartition bool             `json:"has_vendor_partition"`
	HasSuperPartition  bool             `json:"has_super_partition"`
	KernelPath        string            `json:"kernel_path"`
	InitramfsPath     string            `json:"initramfs_path"`
	BootloaderPath    string            `json:"bootloader_path"`
	Compatibility     CompatibilityLevel `json:"compatibility"`
	CompatibilityNotes []string         `json:"compatibility_notes"`
	AndroidVersion    string            `json:"android_version"`
	AndroidAPILevel   int               `json:"android_api_level"`
	SecurityPatchLevel string           `json:"security_patch_level"`
	BuildFingerprint  string            `json:"build_fingerprint"`
	InspectedAt       time.Time         `json:"inspected_at"`
	Errors            []string          `json:"errors"`
	Warnings          []string          `json:"warnings"`
}

// Inspector inspects Android images
type Inspector struct{}

// NewInspector creates a new image inspector
func NewInspector() *Inspector {
	return &Inspector{}
}

// Inspect inspects an image file and returns detailed information
func (i *Inspector) Inspect(path string) (*InspectionResult, error) {
	result := &InspectionResult{
		Path:          path,
		Format:        FormatUnknown,
		Architecture:  ArchUnknown,
		Partitions:    []PartitionInfo{},
		Compatibility: CompatIncompatible,
		InspectedAt:   time.Now(),
		Errors:        []string{},
		Warnings:      []string{},
	}

	// Check file exists
	info, err := os.Stat(path)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("File not accessible: %v", err))
		return result, err
	}
	result.SizeBytes = uint64(info.Size())

	// Detect format
	format, err := i.detectFormat(path)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Format detection failed: %v", err))
	} else {
		result.Format = format
	}

	// Inspect based on format
	switch format {
	case FormatRAW, FormatIMG, FormatQCOW2:
		i.inspectDiskImage(path, result)
	case FormatISO:
		i.inspectISO(path, result)
	case FormatZIP:
		i.inspectArchive(path, result)
	default:
		result.Warnings = append(result.Warnings, fmt.Sprintf("Unsupported format: %s", format))
	}

	// Classify compatibility
	i.classifyCompatibility(result)

	return result, nil
}

// detectFormat detects the image format by reading magic bytes
func (i *Inspector) detectFormat(path string) (ImageFormat, error) {
	file, err := os.Open(path)
	if err != nil {
		return FormatUnknown, err
	}
	defer file.Close()

	header := make([]byte, 4096)
	n, err := file.Read(header)
	if err != nil && err != io.EOF {
		return FormatUnknown, err
	}
	header = header[:n]

	// Check magic bytes
	if bytes.HasPrefix(header, []byte{0x51, 0x46, 0x49, 0xFB}) { // QFI\0xfb
		return FormatQCOW2, nil
	}
	if bytes.HasPrefix(header, []byte{0x43, 0x44, 0x30, 0x30, 0x31}) { // CD001
		return FormatISO, nil
	}
	if bytes.HasPrefix(header, []byte{0x50, 0x4B, 0x03, 0x04}) { // PK\0x03\0x04
		return FormatZIP, nil
	}
	if bytes.HasPrefix(header, []byte{0x1F, 0x8B}) { // gzip
		return FormatGZIP, nil
	}
	if bytes.HasPrefix(header, []byte{0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00}) { // xz
		return FormatXZ, nil
	}
	if bytes.HasPrefix(header, []byte{0x4B, 0x44, 0x4D}) { // KDM - VMDK
		return FormatVMDK, nil
	}
	if bytes.HasPrefix(header, []byte{0x3C, 0x3C, 0x3C, 0x3C}) { // <<<< - VDI
		return FormatVDI, nil
	}
	if len(header) >= 8 && binary.LittleEndian.Uint32(header[0:4]) == 0x636F6E65 && binary.LittleEndian.Uint32(header[4:8]) == 0x74617073 { // "conectaps" - VHD
		return FormatVHD, nil
	}

	// Check file extension as fallback
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".iso":
		return FormatISO, nil
	case ".qcow2", ".qcow":
		return FormatQCOW2, nil
	case ".vmdk":
		return FormatVMDK, nil
	case ".vdi":
		return FormatVDI, nil
	case ".vhd", ".vhdx":
		return FormatVHD, nil
	case ".img", ".raw":
		return FormatRAW, nil
	case ".zip":
		return FormatZIP, nil
	case ".gz", ".gzip":
		return FormatGZIP, nil
	case ".xz":
		return FormatXZ, nil
	}

	// Default to RAW for unknown
	return FormatRAW, nil
}

// inspectDiskImage inspects a raw/qcow2 disk image
func (i *Inspector) inspectDiskImage(path string, result *InspectionResult) {
	// For now, we do basic inspection without external tools
	// A full implementation would use libguestfs, qemu-img, or libvirt

	// Try to read MBR/GPT partition table
	i.readPartitionTable(path, result)

	// Try to detect filesystem and Android-specific partitions
	i.detectAndroidPartitions(result)

	// For QCOW2, we could use qemu-img info
	if result.Format == FormatQCOW2 {
		i.inspectQCOW2(path, result)
	}
}

// inspectQCOW2 inspects QCOW2 specific metadata
func (i *Inspector) inspectQCOW2(path string, result *InspectionResult) {
	// Would use qemu-img info command
	// For now, just note it's QCOW2
	result.Warnings = append(result.Warnings, "QCOW2 inspection limited without qemu-img")
}

// readPartitionTable reads the partition table (MBR/GPT)
func (i *Inspector) readPartitionTable(path string, result *InspectionResult) {
	file, err := os.Open(path)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to open image: %v", err))
		return
	}
	defer file.Close()

	// Read first sector (MBR)
	mbr := make([]byte, 512)
	n, err := file.Read(mbr)
	if err != nil || n < 512 {
		return
	}

	// Check MBR signature
	if mbr[510] == 0x55 && mbr[511] == 0xAA {
		result.HasBootloader = true
		i.parseMBR(mbr, result)
		return
	}

	// Check GPT header (LBA 1)
	gptHeader := make([]byte, 512)
	file.Seek(512, io.SeekStart)
	n, err = file.Read(gptHeader)
	if err != nil || n < 512 {
		return
	}

	if bytes.HasPrefix(gptHeader, []byte("EFI PART")) {
		result.HasBootloader = true
		i.parseGPT(file, result)
	}
}

// parseMBR parses MBR partition table
func (i *Inspector) parseMBR(mbr []byte, result *InspectionResult) {
	// Partition entries start at offset 446, each 16 bytes
	for i := 0; i < 4; i++ {
		offset := 446 + i*16
		if offset+16 > len(mbr) {
			break
		}

		entry := mbr[offset : offset+16]
		if entry[4] == 0x00 { // Empty partition
			continue
		}

		part := PartitionInfo{
			StartSector: uint64(binary.LittleEndian.Uint32(entry[8:12])),
			NumSectors:  uint64(binary.LittleEndian.Uint32(entry[12:16])),
			SizeBytes:   uint64(binary.LittleEndian.Uint32(entry[12:16])) * 512,
			IsBootable:  entry[0] == 0x80,
		}

		// Determine partition type from ID
		part.Type = i.mbrPartitionType(entry[4])
		part.Name = fmt.Sprintf("Partition %d", i+1)

		result.Partitions = append(result.Partitions, part)
	}
}

// mbrPartitionType maps MBR partition type to our type
func (i *Inspector) mbrPartitionType(typeByte byte) PartitionType {
	switch typeByte {
	case 0x0C, 0x0E, 0x0B, 0x06, 0x07: // FAT/NTFS
		return PartData
	case 0x83, 0x82: // Linux
		return PartSystem
	case 0xEE: // GPT protective
		return PartUnknown
	case 0xEF: // EFI System
		return PartEFI
	default:
		return PartUnknown
	}
}

// parseGPT parses GPT partition table
func (i *Inspector) parseGPT(file *os.File, result *InspectionResult) {
	// Read GPT header at LBA 1
	header := make([]byte, 512)
	file.Seek(512, io.SeekStart)
	file.Read(header)

	// Parse header
	// Offset 72: Partition entry LBA (8 bytes)
	// Offset 80: Number of partition entries (4 bytes)
	// Offset 84: Size of partition entry (4 bytes)

	// For simplicity, we'll just note GPT is present
	// A full implementation would parse all entries
	result.Warnings = append(result.Warnings, "GPT partition table detected (parsing not fully implemented)")
}

// detectAndroidPartitions detects Android-specific partitions
func (i *Inspector) detectAndroidPartitions(result *InspectionResult) {
	androidPartitions := map[string]PartitionType{
		"boot":       PartBoot,
		"dtbo":       PartDTB,
		"recovery":   PartRecovery,
		"system":     PartSystem,
		"vendor":     PartVendor,
		"product":    PartProduct,
		"odm":        PartODM,
		"userdata":   PartData,
		"vbmeta":     PartVBMeta,
		"vbmeta_system": PartVBMeta,
		"super":      PartSuper,
		"dtb":        PartDTB,
		"kernel":     PartKernel,
		"ramdisk":    PartRamdisk,
		"initramfs":  PartRamdisk,
	}

	for j := range result.Partitions {
		name := strings.ToLower(result.Partitions[j].Name)
		if ptype, ok := androidPartitions[name]; ok {
			result.Partitions[j].Type = ptype
		}
	}

	// Check for key partitions
	for _, p := range result.Partitions {
		switch p.Type {
		case PartSystem:
			result.HasSystemPartition = true
		case PartVendor:
			result.HasVendorPartition = true
		case PartSuper:
			result.HasSuperPartition = true
		case PartBoot:
			result.HasBootloader = true
		case PartKernel:
			result.HasKernel = true
		case PartRamdisk:
			result.HasInitramfs = true
		}
	}
}

// inspectISO inspects an ISO image
func (i *Inspector) inspectISO(path string, result *InspectionResult) {
	result.Warnings = append(result.Warnings, "ISO inspection not fully implemented - would use libisofs or isoinfo")
	result.Compatibility = CompatExperimental
	result.CompatibilityNotes = append(result.CompatibilityNotes, "ISO images may contain Android-x86 installer; not directly bootable as VM disk")
}

// inspectArchive inspects a ZIP/archive
func (i *Inspector) inspectArchive(path string, result *InspectionResult) {
	result.Warnings = append(result.Warnings, "Archive inspection not fully implemented - would extract and analyze contents")
	result.Compatibility = CompatExperimental
	result.CompatibilityNotes = append(result.CompatibilityNotes, "Archive may contain multiple image components; manual extraction required")
}

// classifyCompatibility classifies the image compatibility
func (i *Inspector) classifyCompatibility(result *InspectionResult) {
	notes := []string{}

	// Check for complete bootable system
	hasKernel := result.HasKernel
	hasInitramfs := result.HasInitramfs
	hasBootloader := result.HasBootloader
	hasSystem := result.HasSystemPartition

	// Android-x86 ISO or prebuilt QEMU images are "full"
	// Raw GSI system.img alone is "incompatible"

	switch result.Format {
	case FormatISO:
		// Check if it's Android-x86
		result.Compatibility = CompatConfig
		notes = append(notes, "ISO image - may be Android-x86 installer; requires installation to disk first")

	case FormatQCOW2, FormatRAW, FormatIMG:
		if hasKernel && hasInitramfs && hasBootloader && hasSystem {
			result.Compatibility = CompatFull
			notes = append(notes, "Complete bootable system detected with kernel, initramfs, bootloader, and system partition")
		} else if hasSystem && (hasKernel || hasInitramfs) {
			result.Compatibility = CompatConfig
			notes = append(notes, "Partial system - has system partition but missing kernel/initramfs/bootloader")
		} else if hasSystem {
			result.Compatibility = ConfigIncompatible
			notes = append(notes, "System partition only - missing kernel, initramfs, and bootloader (typical GSI)")
		} else {
			result.Compatibility = CompatIncompatible
			notes = append(notes, "No recognizable Android partitions found")
		}

	case FormatZIP, FormatGZIP, FormatXZ:
		result.Compatibility = CompatExperimental
		notes = append(notes, "Compressed archive - contents unknown without extraction")

	default:
		result.Compatibility = CompatIncompatible
		notes = append(notes, fmt.Sprintf("Unsupported format: %s", result.Format))
	}

	// Architecture-specific notes
	if result.Architecture == ArchARM64 || result.Architecture == ArchARM {
		notes = append(notes, "ARM/ARM64 guest on x86_64 host requires TCG emulation (slow)")
	}

	result.CompatibilityNotes = notes
}

// InspectMultiple inspects multiple images and returns combined results
func (i *Inspector) InspectMultiple(paths []string) ([]*InspectionResult, error) {
	results := make([]*InspectionResult, 0, len(paths))
	for _, path := range paths {
		result, err := i.Inspect(path)
		if err != nil {
			// Continue with other images
			result = &InspectionResult{
				Path:       path,
				Format:     FormatUnknown,
				Errors:     []string{err.Error()},
				Compatibility: CompatIncompatible,
			}
		}
		results = append(results, result)
	}
	return results, nil
}

// GetSupportedFormats returns list of supported image formats
func GetSupportedFormats() []ImageFormat {
	return []ImageFormat{
		FormatRAW,
		FormatQCOW2,
		FormatISO,
		FormatIMG,
		FormatVMDK,
		FormatVDI,
		FormatVHD,
		FormatVHDX,
		FormatZIP,
		FormatGZIP,
		FormatXZ,
	}
}

// IsFormatSupported checks if a format is supported
func IsFormatSupported(format ImageFormat) bool {
	for _, f := range GetSupportedFormats() {
		if f == format {
			return true
		}
	}
	return false
}

// ConvertFormat converts an image to another format using qemu-img
func ConvertFormat(inputPath, outputPath string, outputFormat ImageFormat) error {
	// Would use qemu-img convert
	// qemu-img convert -f raw -O qcow2 input.img output.qcow2
	return fmt.Errorf("not implemented - requires qemu-img")
}

// CreateDiskImage creates a new empty disk image
func CreateDiskImage(path string, sizeBytes uint64, format ImageFormat) error {
	// Would use qemu-img create
	return fmt.Errorf("not implemented - requires qemu-img")
}

// ResizeDiskImage resizes a disk image
func ResizeDiskImage(path string, newSizeBytes uint64) error {
	// Would use qemu-img resize
	return fmt.Errorf("not implemented - requires qemu-img")
}

// SnapshotDiskImage creates a snapshot of a disk image
func SnapshotDiskImage(path, snapshotPath string) error {
	// Would use qemu-img snapshot
	return fmt.Errorf("not implemented - requires qemu-img")
}

// ExtractPartition extracts a partition from an image
func ExtractPartition(imagePath string, partitionNum int, outputPath string) error {
	// Would use dd or libguestfs
	return fmt.Errorf("not implemented")
}

// MountImage mounts an image for inspection (read-only)
// Requires admin privileges on Windows
func MountImage(path string) (string, error) {
	// Would use Windows VHD mount or WSL2
	return "", fmt.Errorf("not implemented")
}

// UnmountImage unmounts a previously mounted image
func UnmountImage(mountPoint string) error {
	return fmt.Errorf("not implemented")
}