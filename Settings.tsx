import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import {
  Zap,
  Cpu,
  Monitor,
  Layers,
  Volume2,
  Wifi,
  Database,
  MousePointer,
  Download,
  Globe,
  Palette,
  Settings as SettingsIcon,
  Terminal,
  Shield,
  Save,
  RotateCcw,
  ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useThemeStore } from '@/hooks/useThemeStore'
import { useLanguageStore } from '@/hooks/useLanguageStore'
import { useToast } from '@/components/ui/Toaster'

const settingsSections = [
  { id: 'performance', label: 'performance', icon: Zap, description: 'Performance presets and resource allocation' },
  { id: 'virtualization', label: 'virtualization', icon: Cpu, description: 'Virtualization engine and acceleration' },
  { id: 'graphics', label: 'graphics', icon: Layers, description: 'Graphics device and rendering settings' },
  { id: 'display', label: 'display', icon: Monitor, description: 'Display resolution, DPI, and scaling' },
  { id: 'audio', label: 'audio', icon: Volume2, description: 'Audio device and sample rate' },
  { id: 'network', label: 'network', icon: Wifi, description: 'Network mode and port forwarding' },
  { id: 'storage', label: 'storage', icon: Database, description: 'Storage format, cache, and defaults' },
  { id: 'input', label: 'input', icon: MousePointer, description: 'Keyboard, mouse, and gamepad settings' },
  { id: 'downloads', label: 'downloads', icon: Download, description: 'Download directory and verification' },
  { id: 'language', label: 'language', icon: Globe, description: 'Language and RTL support' },
  { id: 'appearance', label: 'appearance', icon: Palette, description: 'Theme, fonts, and UI customization' },
  { id: 'advanced', label: 'advanced', icon: SettingsIcon, description: 'Advanced QEMU arguments and debugging' },
  { id: 'diagnostics', label: 'logs', icon: Terminal, description: 'Logging, crash reports, and telemetry' },
]

export function Settings() {
  const { t } = useTranslation()
  const { section } = useParams<{ section?: string }>()
  const { theme, setTheme, toggleTheme } = useThemeStore()
  const { language, setLanguage } = useLanguageStore()
  const { success } = useToast()
  const [activeSection, setActiveSection] = useState(section || 'performance')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    success(t('saved'), t('settingsSaved') || 'Settings saved successfully')
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    // Reset to defaults
    success(t('reset'), t('settingsReset') || 'Settings reset to defaults')
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="heading-2">{t('settings')}</h1>
          <p className="body text-text-tertiary mt-1">{t('settingsSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            <span>{t('resetToDefaults')}</span>
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saved}>
            <Save className="w-4 h-4" />
            <span>{saved ? t('saved') : t('save')}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1">
          <Card className="card-hover h-fit sticky top-24">
            <CardContent className="p-2">
              <nav className="space-y-1" aria-label="Settings sections">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      'hover:bg-surface-hover',
                      activeSection === section.id
                        ? 'bg-brand-500/10 text-brand-600 border-l-3 border-brand-500'
                        : 'text-text-secondary'
                    )}
                  >
                    <section.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{t(section.label)}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <Card className="card-hover">
            <CardHeader className="pb-0">
              <CardTitle>{t(settingsSections.find(s => s.id === activeSection)?.label || 'settings')}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSection(activeSection, t)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function renderSection(sectionId: string, t: any) {
  switch (sectionId) {
    case 'performance':
      return <PerformanceSettings t={t} />
    case 'virtualization':
      return <VirtualizationSettings t={t} />
    case 'graphics':
      return <GraphicsSettings t={t} />
    case 'display':
      return <DisplaySettings t={t} />
    case 'audio':
      return <AudioSettings t={t} />
    case 'network':
      return <NetworkSettings t={t} />
    case 'storage':
      return <StorageSettings t={t} />
    case 'input':
      return <InputSettings t={t} />
    case 'downloads':
      return <DownloadsSettings t={t} />
    case 'language':
      return <LanguageSettings t={t} />
    case 'appearance':
      return <AppearanceSettings t={t} />
    case 'advanced':
      return <AdvancedSettings t={t} />
    case 'diagnostics':
      return <DiagnosticsSettings t={t} />
    default:
      return <PerformanceSettings t={t} />
  }
}

// Performance Settings
function PerformanceSettings({ t }: { t: any }) {
  const presets = [
    { id: 'low', label: t('lowEnd'), desc: t('lowEndDesc'), icon: '💻', specs: '2 cores, 2GB RAM, 4GB Storage' },
    { id: 'balanced', label: t('balanced'), desc: t('balancedDesc'), icon: '⚖️', specs: '4 cores, 4GB RAM, 8GB Storage' },
    { id: 'performance', label: t('performance'), desc: t('performanceDesc'), icon: '🚀', specs: '8 cores, 8GB RAM, 16GB Storage' },
    { id: 'manual', label: t('manual'), desc: t('manualDesc'), icon: '🔧', specs: 'Custom configuration' },
  ]

  return (
    <div className="space-y-6">
      <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg">
        <h4 className="font-medium text-brand-700 dark:text-brand-300 mb-2">{t('performancePresetInfo')}</h4>
        <p className="text-sm text-text-secondary">{t('performancePresetInfoText')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map(preset => (
          <Card
            key={preset.id}
            className={clsx('card-interactive p-4', 'border-2', 'border-border-primary')}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{preset.icon}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-text-primary">{preset.label}</h4>
                <p className="text-sm text-text-tertiary mt-1">{preset.desc}</p>
                <p className="text-xs text-brand-600 mt-2 font-mono">{preset.specs}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Virtualization Settings
function VirtualizationSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">{t('engineSettings')}</h4>
          <Select label={t('engine') || 'Engine'} defaultValue="qemu">
            <option value="qemu">QEMU (Default)</option>
          </Select>
          <Select label={t('acceleration') || 'Acceleration'} defaultValue="auto">
            <option value="auto">{t('autoDetect')}</option>
            <option value="whpx">{t('whpx')} (Windows Hypervisor Platform)</option>
            <option value="tcg">{t('tcg')} (Software Emulation)</option>
          </Select>
          <Input label={t('qemuPath') || 'QEMU Path'} placeholder="Auto-detect" hint={t('qemuPathHint')} />
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">{t('defaultSettings')}</h4>
          <Select label={t('defaultCpuArch') || 'Default CPU Architecture'} defaultValue="x86_64">
            <option value="x86_64">x86_64</option>
            <option value="arm64">ARM64</option>
          </Select>
          <Select label={t('defaultMachine') || 'Default Machine Type'} defaultValue="pc">
            <option value="pc">PC (x86_64)</option>
            <option value="virt">Virt (ARM64)</option>
          </Select>
          <Select label={t('cpuModel') || 'CPU Model'} defaultValue="host">
            <option value="host">{t('hostPassthrough')}</option>
            <option value="max">Max Features</option>
          </Select>
        </div>
      </div>

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-3">{t('virtualizationStatus')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <StatusItem label={t('whpx')} value={t('available')} variant="success" />
          <StatusItem label={t('tcg')} value={t('available')} variant="success" />
          <StatusItem label={t('hyperv')} value={t('enabled')} variant="warning" />
          <StatusItem label={t('nestedVirt')} value={t('notSupported')} variant="neutral" />
        </div>
      </div>
    </div>
  )
}

// Graphics Settings
function GraphicsSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">{t('displayDevice')}</h4>
          <Select label={t('graphicsDevice')} defaultValue="virtio-gpu-pci">
            <option value="virtio-gpu-pci">virtio-gpu-pci (Recommended)</option>
            <option value="virtio-gpu-gl-pci">virtio-gpu-gl-pci (OpenGL)</option>
            <option value="virtio-vga">virtio-vga (Basic 2D)</option>
            <option value="qxl">QXL (Legacy)</option>
          </Select>
          <Select label={t('renderer')} defaultValue="auto">
            <option value="auto">{t('auto')}</option>
            <option value="virgl">{t('virgl')}</option>
            <option value="venus">{t('venus')} (Experimental)</option>
            <option value="software">{t('software')}</option>
          </Select>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">{t('accelerationOptions')}</h4>
          <Switch label={t('enable3D')} defaultChecked hint={t('enable3DHint')} />
          <Switch label={t('enableVirgl')} defaultChecked hint={t('enableVirglHint')} />
          <Switch label={t('enableGlSl')} defaultChecked hint={t('enableGlSlHint')} />
          <Input label={t('vram') || 'VRAM (MB)'} type="number" defaultValue="256" min="64" max="4096" />
        </div>
      </div>

      <div className="p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg">
        <h4 className="font-medium text-status-warning mb-2">{t('graphicsCompatibility')}</h4>
        <ul className="space-y-1 text-sm text-text-secondary">
          <li>• {t('gfxNote1')}</li>
          <li>• {t('gfxNote2')}</li>
          <li>• {t('gfxNote3')}</li>
          <li>• {t('gfxNote4')}</li>
        </ul>
      </div>
    </div>
  )
}

// Display Settings
function DisplaySettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label={t('defaultWidth') || 'Default Width'} type="number" defaultValue="1280" min="320" max="7680" />
        <Input label={t('defaultHeight') || 'Default Height'} type="number" defaultValue="720" min="240" max="4320" />
        <Input label={t('defaultDPI') || 'Default DPI'} type="number" defaultValue="160" min="72" max="640" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label={t('defaultScale') || 'Default Scale'} type="number" step="0.25" defaultValue="1" min="0.5" max="3" />
        <Select label={t('aspectRatio')} defaultValue="16:9">
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="3:2">3:2</option>
          <option value="16:10">16:10</option>
          <option value="free">Free</option>
        </Select>
        <Input label={t('rotation') || 'Rotation'} type="number" defaultValue="0" step="90" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Switch label={t('fullscreenByDefault') || 'Start Fullscreen'} />
        <Switch label={t('vsync') || 'Vertical Sync'} defaultChecked />
        <Switch label={t('showCursor') || 'Show Cursor'} defaultChecked />
      </div>
    </div>
  )
}

// Audio Settings
function AudioSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <Switch label={t('enableAudio') || 'Enable Audio'} defaultChecked />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label={t('audioDevice')} defaultValue="pa">
          <option value="pa">PulseAudio</option>
          <option value="spice">SPICE</option>
          <option value="none">None</option>
        </Select>
        <Input label={t('sampleRate')} type="number" defaultValue="48000" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('inputDevice') || 'Input Device'} placeholder="Default" />
        <Input label={t('outputDevice') || 'Output Device'} placeholder="Default" />
      </div>
    </div>
  )
}

// Network Settings
function NetworkSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <Select label={t('networkMode')} defaultValue="user">
        <option value="user">{t('userMode')} (NAT)</option>
        <option value="tap">{t('tapMode')}</option>
        <option value="bridge">{t('bridgeMode')}</option>
        <option value="none">{t('noNetwork')}</option>
      </Select>

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-3">{t('defaultPortForwards')}</h4>
        <div className="space-y-2">
          <PortForwardRow protocol="tcp" hostPort={5555} guestPort={5555} label="ADB" />
        </div>
        <Button variant="ghost" size="sm" className="mt-2">
          + {t('addPortForward')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch label={t('enableIPv6')} />
        <Switch label={t('isolateNetwork')} />
      </div>
    </div>
  )
}

// Storage Settings
function StorageSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('defaultStorageSize') || 'Default Storage (GB)'} type="number" defaultValue="8" min="1" max="2048" />
        <Select label={t('format')} defaultValue="qcow2">
          <option value="qcow2">QCOW2</option>
          <option value="raw">RAW</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label={t('cacheMode')} defaultValue="writeback">
          <option value="writeback">Writeback</option>
          <option value="writethrough">Writethrough</option>
          <option value="none">None</option>
          <option value="directsync">Direct Sync</option>
          <option value="unsafe">Unsafe</option>
        </Select>
        <Select label={t('discard')} defaultValue="unmap">
          <option value="unmap">UNMAP</option>
          <option value="ignore">Ignore</option>
        </Select>
        <Select label={t('detectZeroes')} defaultValue="on">
          <option value="on">On</option>
          <option value="off">Off</option>
          <option value="unmap">UNMAP only</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('imageDirectory')} placeholder="~/EmuNexa/images" />
        <Input label={t('workingDirectory')} placeholder="~/EmuNexa/vms" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch label={t('enableSnapshots')} defaultChecked />
        <Switch label={t('autoCompact')} defaultChecked />
      </div>
    </div>
  )
}

// Input Settings
function InputSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <Select label={t('keyboardLayout')} defaultValue="en-us">
        <option value="en-us">English (US)</option>
        <option value="ar">Arabic</option>
        <option value="de">German</option>
        <option value="fr">French</option>
        <option value="es">Spanish</option>
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label={t('mouseMode')} defaultValue="relative">
          <option value="relative">Relative (Tablet)</option>
          <option value="absolute">Absolute (Mouse)</option>
        </Select>
        <Input label={t('mouseSensitivity')} type="number" step="0.1" defaultValue="1" min="0.1" max="5" />
      </div>

      <Switch label={t('enableGamepad')} defaultChecked />

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-3">{t('keyMapping')}</h4>
        <p className="text-sm text-text-secondary">{t('keyMappingHint')}</p>
        <Button variant="ghost" size="sm">
          + {t('addMapping')}
        </Button>
      </div>
    </div>
  )
}

// Downloads Settings
function DownloadsSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <Input label={t('downloadDirectory')} placeholder="~/EmuNexa/downloads" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch label={t('verifyHashes')} defaultChecked hint={t('verifyHashesHint')} />
        <Switch label={t('verifySignatures')} defaultChecked hint={t('verifySignaturesHint')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label={t('maxConcurrent')} type="number" defaultValue="2" min="1" max="10" />
        <Input label={t('timeout')} type="number" defaultValue="300" min="30" max="3600" />
        <Switch label={t('resumeEnabled')} defaultChecked />
      </div>

      <Input label={t('proxyUrl')} placeholder="http://proxy:port" />
    </div>
  )
}

// Language Settings
function LanguageSettings({ t }: { t: any }) {
  const { language, setLanguage } = useLanguageStore()

  return (
    <div className="space-y-6">
      <Select
        label={t('language')}
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
      >
        <option value="en">{t('english')}</option>
        <option value="ar">{t('arabic')}</option>
      </Select>

      <Switch
        label={t('rtlSupport') || 'Right-to-Left Support'}
        checked={language === 'ar'}
        onChange={(checked) => setLanguage(checked ? 'ar' : 'en')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('dateFormat')} defaultValue="YYYY-MM-DD" />
        <Input label={t('timeFormat')} defaultValue="HH:mm:ss" />
      </div>
    </div>
  )
}

// Appearance Settings
function AppearanceSettings({ t }: { t: any }) {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {['light', 'dark', 'system'].map((t) => (
          <Button
            key={t}
            variant={theme === t ? 'primary' : 'secondary'}
            className="flex-1 py-3"
            onClick={() => setTheme(t as 'light' | 'dark' | 'system')}
          >
            <span className="capitalize">{t}</span>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label={t('accentColor') || 'Accent Color'} type="color" defaultValue="#14b8a6" className="h-12" />
        <Input label={t('fontSize') || 'Font Size'} type="number" defaultValue="14" min="12" max="24" />
        <Select label={t('fontFamily')} defaultValue="Inter">
          <option value="Inter">Inter</option>
          <option value="system">System Default</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch label={t('animations')} defaultChecked />
        <Switch label={t('compactMode')} />
        <Switch label={t('showTooltips')} defaultChecked />
        <Switch label={t('highContrast')} />
      </div>
    </div>
  )
}

// Advanced Settings
function AdvancedSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg">
        <h4 className="font-medium text-status-warning mb-2">{t('advancedWarning')}</h4>
        <p className="text-sm text-text-secondary">{t('advancedWarningText')}</p>
      </div>

      <div className="space-y-4">
        <Input label={t('extraQemuArgs')} placeholder="-device ... -object ..." />
        <Input label={t('kernelPath')} placeholder="Path to kernel" />
        <Input label={t('initrdPath')} placeholder="Path to initrd" />
        <Input label={t('kernelArgs')} placeholder="console=ttyS0 androidboot.hardware=..." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label={t('bootOrder')} defaultValue="c">
            <option value="c">Hard Disk (c)</option>
            <option value="d">CD-ROM (d)</option>
            <option value="n">Network (n)</option>
          </Select>
          <Input label={t('biosPath')} placeholder="Custom BIOS path" />
        </div>

        <Input label={t('uefiPath')} placeholder="Custom UEFI firmware path" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch label={t('enableDebug')} />
        <Input label={t('debugLogFile')} placeholder="~/EmuNexa/logs/debug.log" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label={t('gdbPort')} type="number" defaultValue="0" placeholder="0 = disabled" />
        <Input label={t('monitorPort')} type="number" defaultValue="4444" />
        <Input label={t('serialPort')} defaultValue="stdio" />
      </div>
    </div>
  )
}

// Diagnostics Settings
function DiagnosticsSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <Select label={t('logLevel')} defaultValue="info">
        <option value="debug">Debug</option>
        <option value="info">Info</option>
        <option value="warn">Warning</option>
        <option value="error">Error</option>
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch label={t('logToFile')} defaultChecked />
        <Input label={t('logFilePath')} placeholder="~/EmuNexa/logs/emunexa.log" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('maxLogSize')} type="number" defaultValue="10" placeholder="MB" />
        <Input label={t('maxLogFiles')} type="number" defaultValue="5" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch label={t('enableCrashReports')} defaultChecked />
        <Switch label={t('enableTelemetry')} />
      </div>

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-3">{t('diagnosticsActions')}</h4>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">{t('runDiagnostics')}</Button>
          <Button variant="secondary">{t('viewLogs')}</Button>
          <Button variant="ghost">{t('exportReport')}</Button>
        </div>
      </div>
    </div>
  )
}

// Helper Components
function StatusItem({ label, value, variant }: { label: string; value: string; variant: 'success' | 'warning' | 'error' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between p-2 bg-surface-primary rounded-lg">
      <span className="text-text-tertiary">{label}</span>
      <Badge variant={variant}>{value}</Badge>
    </div>
  )
}

function PortForwardRow({ protocol, hostPort, guestPort, label }: { protocol: string; hostPort: number; guestPort: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 font-mono text-sm text-text-tertiary">{label}</span>
      <Select value={protocol} className="w-24" onChange={() => {}}>
        <option value="tcp">TCP</option>
        <option value="udp">UDP</option>
      </Select>
      <Input type="number" defaultValue={hostPort} className="w-28" placeholder="Host" />
      <span className="text-text-tertiary">→</span>
      <Input type="number" defaultValue={guestPort} className="w-28" placeholder="Guest" />
    </div>
  )
}