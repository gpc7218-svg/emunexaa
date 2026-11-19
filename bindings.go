package ui

import (
	"context"
	"encoding/json"
	"fmt"
	"runtime"
	"time"

	"github.com/emunexa/emunexa/internal/config"
	"github.com/emunexa/emunexa/internal/device"
	"github.com/emunexa/emunexa/internal/hardware"
	"github.com/emunexa/emunexa/internal/virtualization"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct holds the application instance
type App struct {
	ctx          context.Context
	config       *config.Config
	hwInfo       *hardware.HardwareInfo
	virtEngine   *virtualization.Engine
	deviceManager *device.DeviceManager
}

// NewApp creates a new application instance
func NewApp(cfg *config.Config, hwInfo *hardware.HardwareInfo, virtEngine *virtualization.Engine) *App {
	return &App{
		config:     cfg,
		hwInfo:     hwInfo,
		virtEngine: virtEngine,
	}
}

// Startup is called when the app starts
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize device manager
	homeDir, _ := runtime.HomeDir(a.ctx)
	baseDir := fmt.Sprintf("%s/EmuNexa", homeDir)
	dm, err := device.NewDeviceManager(baseDir)
	if err != nil {
		fmt.Printf("Failed to initialize device manager: %v\n", err)
	} else {
		a.deviceManager = dm
	}

	// Initialize hardware detection
	go func() {
		hwInfo, err := hardware.Detect()
		if err == nil {
			a.hwInfo = hwInfo
			runtime.EventsEmit(a.ctx, "hardware:detected", hwInfo)
		}
	}()

	// Initialize virtualization status
	go func() {
		if a.virtEngine != nil {
			accelInfo := a.virtEngine.AccelerationInfo()
			runtime.EventsEmit(a.ctx, "virtualization:status", accelInfo)
		}
	}()

	// Start periodic stats updates
	go a.startStatsUpdater()
}

// DomReady is called when the frontend DOM is ready
func (a *App) DomReady(ctx context.Context) {
	// Emit initial config
	runtime.EventsEmit(ctx, "config:loaded", a.config)

	// Emit device list
	if a.deviceManager != nil {
		devices := a.deviceManager.GetAll()
		runtime.EventsEmit(ctx, "devices:list", devices)
	}
}

// BeforeClose is called when the user tries to close the window
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	// Check if any VMs are running
	if a.virtEngine != nil {
		runningVMs := a.virtEngine.GetRunningVMs()
		if len(runningVMs) > 0 {
			// Ask user for confirmation
			result, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:          runtime.QuestionDialog,
				Title:         "Running Virtual Machines",
				Message:       fmt.Sprintf("There are %d running virtual machine(s). Closing will stop them. Are you sure?", len(runningVMs)),
				Buttons:       []string{"Yes", "No"},
				DefaultButton: "No",
			})
			if err != nil || result != "Yes" {
				return true // Prevent close
			}

			// Stop all running VMs
			for _, instance := range runningVMs {
				a.virtEngine.Stop(ctx, instance.Device)
			}
		}
	}
	return false
}

// Shutdown is called when the app is shutting down
func (a *App) Shutdown(ctx context.Context) {
	if a.virtEngine != nil {
		a.virtEngine.Shutdown()
	}
}

// ============================================================================
// Config Methods
// ============================================================================

// GetConfig returns the current configuration
func (a *App) GetConfig() *config.Config {
	return a.config
}

// UpdateConfig updates the configuration
func (a *App) UpdateConfig(cfg *config.Config) error {
	if err := config.Save(cfg); err != nil {
		return err
	}
	a.config = cfg
	runtime.EventsEmit(a.ctx, "config:updated", cfg)
	return nil
}

// ResetConfig resets configuration to defaults
func (a *App) ResetConfig() error {
	cfg := config.DefaultConfig()
	if err := config.Save(cfg); err != nil {
		return err
	}
	a.config = cfg
	runtime.EventsEmit(a.ctx, "config:updated", cfg)
	return nil
}

// ============================================================================
// Hardware Methods
// ============================================================================

// GetHardwareInfo returns the detected hardware information
func (a *App) GetHardwareInfo() *hardware.HardwareInfo {
	return a.hwInfo
}

// RedetectHardware re-runs hardware detection
func (a *App) RedetectHardware() (*hardware.HardwareInfo, error) {
	hwInfo, err := hardware.Detect()
	if err != nil {
		return nil, err
	}
	a.hwInfo = hwInfo
	runtime.EventsEmit(a.ctx, "hardware:detected", hwInfo)
	return hwInfo, nil
}

// GetPerformancePreset returns the recommended performance preset
func (a *App) GetPerformancePreset() string {
	if a.hwInfo != nil {
		return string(a.hwInfo.GetRecommendedPreset())
	}
	return "balanced"
}

// ============================================================================
// Device Methods
// ============================================================================

// GetDevices returns all devices
func (a *App) GetDevices() []*device.Device {
	if a.deviceManager == nil {
		return []*device.Device{}
	}
	return a.deviceManager.GetAll()
}

// GetDevice returns a specific device by ID
func (a *App) GetDevice(id string) *device.Device {
	if a.deviceManager == nil {
		return nil
	}
	d, _ := a.deviceManager.Get(id)
	return d
}

// CreateDevice creates a new device
func (a *App) CreateDevice(d *device.Device) error {
	if a.deviceManager == nil {
		return fmt.Errorf("device manager not initialized")
	}
	return a.deviceManager.Create(d)
}

// UpdateDevice updates an existing device
func (a *App) UpdateDevice(d *device.Device) error {
	if a.deviceManager == nil {
		return fmt.Errorf("device manager not initialized")
	}
	return a.deviceManager.Update(d)
}

// DeleteDevice deletes a device
func (a *App) DeleteDevice(id string) error {
	if a.deviceManager == nil {
		return fmt.Errorf("device manager not initialized")
	}
	return a.deviceManager.Delete(id)
}

// CloneDevice clones a device with a new name
func (a *App) CloneDevice(id, newName string) (*device.Device, error) {
	if a.deviceManager == nil {
		return nil, fmt.Errorf("device manager not initialized")
	}
	return a.deviceManager.Clone(id, newName)
}

// ValidateDevice validates a device configuration
func (a *App) ValidateDevice(d *device.Device) []error {
	return d.Validate()
}

// ApplyPreset applies a performance preset to a device
func (a *App) ApplyPreset(deviceID, preset string) error {
	if a.deviceManager == nil {
		return fmt.Errorf("device manager not initialized")
	}
	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return fmt.Errorf("device not found: %s", deviceID)
	}
	d.ApplyPreset(preset, a.hwInfo)
	return a.deviceManager.Update(d)
}

// ============================================================================
// Virtualization Methods
// ============================================================================

// StartVM starts a virtual machine
func (a *App) StartVM(deviceID string) error {
	if a.virtEngine == nil || a.deviceManager == nil {
		return fmt.Errorf("engine not initialized")
	}

	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return fmt.Errorf("device not found: %s", deviceID)
	}

	if err := a.virtEngine.Start(a.ctx, d); err != nil {
		return err
	}

	d.MarkUsed()
	a.deviceManager.Update(d)
	runtime.EventsEmit(a.ctx, "vm:started", deviceID)
	return nil
}

// StopVM stops a virtual machine
func (a *App) StopVM(deviceID string) error {
	if a.virtEngine == nil || a.deviceManager == nil {
		return fmt.Errorf("engine not initialized")
	}

	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return fmt.Errorf("device not found: %s", deviceID)
	}

	if err := a.virtEngine.Stop(a.ctx, d); err != nil {
		return err
	}

	runtime.EventsEmit(a.ctx, "vm:stopped", deviceID)
	return nil
}

// RestartVM restarts a virtual machine
func (a *App) RestartVM(deviceID string) error {
	if a.virtEngine == nil || a.deviceManager == nil {
		return fmt.Errorf("engine not initialized")
	}

	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return fmt.Errorf("device not found: %s", deviceID)
	}

	return a.virtEngine.Restart(a.ctx, d)
}

// PauseVM pauses a virtual machine
func (a *App) PauseVM(deviceID string) error {
	if a.virtEngine == nil || a.deviceManager == nil {
		return fmt.Errorf("engine not initialized")
	}

	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return fmt.Errorf("device not found: %s", deviceID)
	}

	return a.virtEngine.Pause(a.ctx, d)
}

// ResumeVM resumes a paused virtual machine
func (a *App) ResumeVM(deviceID string) error {
	if a.virtEngine == nil || a.deviceManager == nil {
		return fmt.Errorf("engine not initialized")
	}

	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return fmt.Errorf("device not found: %s", deviceID)
	}

	return a.virtEngine.Resume(a.ctx, d)
}

// GetVMStatus returns the status of a virtual machine
func (a *App) GetVMStatus(deviceID string) (virtualization.VMStatus, error) {
	if a.virtEngine == nil {
		return virtualization.VMStatusStopped, fmt.Errorf("engine not initialized")
	}

	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return virtualization.VMStatusStopped, fmt.Errorf("device not found: %s", deviceID)
	}

	return a.virtEngine.GetStatus(d)
}

// GetVMStats returns runtime statistics of a virtual machine
func (a *App) GetVMStats(deviceID string) (virtualization.VMStats, error) {
	if a.virtEngine == nil {
		return virtualization.VMStats{Status: virtualization.VMStatusStopped}, fmt.Errorf("engine not initialized")
	}

	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return virtualization.VMStats{Status: virtualization.VMStatusStopped}, fmt.Errorf("device not found: %s", deviceID)
	}

	return a.virtEngine.GetStats(d)
}

// GetRunningVMs returns all running VMs
func (a *App) GetRunningVMs() map[string]*virtualization.VMInstance {
	if a.virtEngine == nil {
		return make(map[string]*virtualization.VMInstance)
	}
	return a.virtEngine.GetRunningVMs()
}

// BuildQEMUArgs builds QEMU command line arguments for a device
func (a *App) BuildQEMUArgs(deviceID string) ([]string, error) {
	if a.virtEngine == nil || a.deviceManager == nil {
		return nil, fmt.Errorf("engine not initialized")
	}

	d, exists := a.deviceManager.Get(deviceID)
	if !exists {
		return nil, fmt.Errorf("device not found: %s", deviceID)
	}

	return a.virtEngine.BuildArgs(d)
}

// GetVirtualizationStatus returns the virtualization engine status
func (a *App) GetVirtualizationStatus() virtualization.AccelerationInfo {
	if a.virtEngine == nil {
		return virtualization.AccelerationInfo{}
	}
	return a.virtEngine.AccelerationInfo()
}

// ============================================================================
// Image Inspection Methods
// ============================================================================

// InspectImage inspects an Android image file
func (a *App) InspectImage(path string) (map[string]interface{}, error) {
	// This would call the image inspector
	// For now, return mock data
	return map[string]interface{}{
		"path":             path,
		"format":           "qcow2",
		"architecture":     "x86_64",
		"sizeBytes":        2 * 1024 * 1024 * 1024,
		"partitions":       []map[string]interface{}{},
		"hasBootloader":    true,
		"hasKernel":        true,
		"hasInitramfs":     true,
		"hasSystemPartition": true,
		"compatibility":    "full",
		"compatibilityNotes": []string{"Complete bootable system detected"},
	}, nil
}

// ============================================================================
// System Methods
// ============================================================================

// GetSystemInfo returns system information
func (a *App) GetSystemInfo() map[string]interface{} {
	return map[string]interface{}{
		"os":           runtime.GOOS,
		"arch":         runtime.GOARCH,
		"goVersion":    runtime.Version(),
		"numCPU":       runtime.NumCPU(),
		"appVersion":   "1.0.0",
	}
}

// OpenExternal opens a URL in the default browser
func (a *App) OpenExternal(url string) error {
	return runtime.BrowserOpenURL(a.ctx, url)
}

// ShowMessageDialog shows a message dialog
func (a *App) ShowMessageDialog(title, message string) error {
	_, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    runtime.InfoDialog,
		Title:   title,
		Message: message,
	})
	return err
}

// ============================================================================
// Private Methods
// ============================================================================

// startStatsUpdater starts a goroutine that periodically emits VM stats
func (a *App) startStatsUpdater() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if a.ctx == nil {
				return
			}

			if a.virtEngine != nil {
				runningVMs := a.virtEngine.GetRunningVMs()
				for id, instance := range runningVMs {
					stats, err := a.virtEngine.GetStats(instance.Device)
					if err == nil {
						runtime.EventsEmit(a.ctx, "vm:stats", map[string]interface{}{
							"deviceId": id,
							"stats":    stats,
						})
					}
				}
			}

			// Emit system stats
			if a.hwInfo != nil {
				// Would get real system stats here
				runtime.EventsEmit(a.ctx, "system:stats", map[string]interface{}{
					"cpuUsage":    0,
					"memoryUsage": 0,
				})
			}
		}
	}
}

// Need to import time
import "time"