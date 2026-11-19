// EmuNexa - Modern Android Virtualization Platform for Windows
// Copyright (c) 2025 EmuNexa Authors. All rights reserved.

package main

import (
	"context"
	"embed"
	"fmt"
	"os"
	"runtime"
	"runtime/debug"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"github.com/emunexa/emunexa/internal/config"
	"github.com/emunexa/emunexa/internal/hardware"
	"github.com/emunexa/emunexa/internal/virtualization"
	"github.com/emunexa/emunexa/internal/ui"
)

//go:embed all:frontend/dist
var assets embed.FS

// Version information (set at build time via ldflags)
var (
	Version   = "dev"
	Commit    = "none"
	BuildDate = "unknown"
)

func main() {
	// Set GOMAXPROCS to match CPU cores for better performance
	runtime.GOMAXPROCS(runtime.NumCPU())

	// Print version info in debug mode
	if Version != "dev" {
		fmt.Printf("EmuNexa v%s (commit: %s, built: %s)\n", Version, Commit, BuildDate)
	}

	// Initialize configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Detect hardware capabilities
	hwInfo, err := hardware.Detect()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to detect hardware: %v\n", err)
		// Non-fatal, continue with defaults
		hwInfo = hardware.DefaultInfo()
	}

	// Initialize virtualization engine
	virtEngine, err := virtualization.NewEngine(cfg.Virtualization, hwInfo)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize virtualization engine: %v\n", err)
		os.Exit(1)
	}
	defer virtEngine.Shutdown()

	// Create application instance
	app := ui.NewApp(cfg, hwInfo, virtEngine)

	// Configure Wails application
	err = wails.Run(&options.App{
		Title:             "EmuNexa",
		Width:             1280,
		Height:            800,
		MinWidth:          1024,
		MinHeight:         720,
		DisableResize:     false,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: false,
		BackgroundColour:  &options.RGBA{R: 18, G: 18, B: 20, A: 1}, // Dark theme background
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:             nil, // Custom menu handled in frontend
		Logger:           nil, // Custom logger
		LogLevel:         options.LOG_LEVEL_INFO,
		OnStartup:        app.Startup,
		OnDomReady:       app.DomReady,
		OnBeforeClose:    app.BeforeClose,
		OnShutdown:       app.Shutdown,
		WindowStartState: options.Normal,
		Bind: []interface{}{
			app,
			cfg,
			hwInfo,
			virtEngine,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
			DisableFramelessWindowDecorations: false,
			WebviewUserDataPath: "",
			Theme:                windows.SystemDefault,
			CustomSysMenu:        nil,
			Messages:             nil,
		},
	})

	if err != nil {
		fmt.Fprintf(os.Stderr, "Application error: %v\n", err)
		debug.PrintStack()
		os.Exit(1)
	}
}