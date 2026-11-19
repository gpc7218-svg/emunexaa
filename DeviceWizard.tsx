import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  HardDrive,
  Cpu,
  MemoryStick,
  Monitor,
  Layers,
  Volume2,
  Wifi,
  Settings,
  Search,
  FileText,
  Smartphone,
  RotateCcw,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Progress } from '@/components/ui/Progress'
import { useDeviceStore } from '@/hooks/useDeviceStore'
import { useToast } from '@/components/ui/Toaster'
import { useImageStore } from '@/hooks/useImageStore'

type WizardStep =
  | 'name'
  | 'image'
  | 'cpu'
  | 'memory'
  | 'storage'
  | 'display'
  | 'graphics'
  | 'audio'
  | 'network'
  | 'advanced'
  | 'review'

const steps: { id: WizardStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'name', label: 'deviceName', icon: FileText },
  { id: 'image', label: 'androidImage', icon: HardDrive },
  { id: 'cpu', label: 'cpu', icon: Cpu },
  { id: 'memory', label: 'memory', icon: MemoryStick },
  { id: 'storage', label: 'storage', icon: Database },
  { id: 'display', label: 'display', icon: Monitor },
  { id: 'graphics', label: 'graphics', icon: Layers },
  { id: 'audio', label: 'audio', icon: Volume2 },
  { id: 'network', label: 'network', icon: Wifi },
  { id: 'advanced', label: 'advanced', icon: Settings },
  { id: 'review', label: 'review', icon: Check },
]

const compatibilityLabels = {
  full: { label: 'compatible', variant: 'success' as const },
  config: { label: 'needsConfig', variant: 'warning' as const },
  experimental: { label: 'experimental', variant: 'info' as const },
  incompatible: { label: 'incompatible', variant: 'error' as const },
}

export function DeviceWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addDevice } = useDeviceStore()
  const { inspectImage } = useImageStore()
  const { success, error } = useToast()
  const [currentStep, setCurrentStep] = useState<WizardStep>('name')
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [imageInspection, setImageInspection] = useState<any>(null)
  const [inspecting, setInspecting] = useState(false)

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  const updateFormData = useCallback((data: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }, [])

  const handleNext = async () => {
    if (currentStep === 'image' && formData.imagePath) {
      setInspecting(true)
      try {
        const result = await inspectImage(formData.imagePath)
        setImageInspection(result)
        updateFormData({ imageInspection: result })
      } catch (err) {
        error(t('error'), t('errorImageInspection') || 'Failed to inspect image')
      } finally {
        setInspecting(false)
      }
    }

    setCompletedSteps(prev => new Set([...prev, currentStep]))
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id)
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id)
    }
  }

  const handleCreate = async () => {
    try {
      const deviceData = {
        name: formData.deviceName,
        status: 'stopped' as const,
        architecture: formData.cpuArchitecture || 'x86_64',
        cpu: { cores: formData.cpuCores || 4, threads: formData.cpuThreads || 1 },
        memory: { sizeMB: formData.memorySizeMB || 4096 },
        storage: { sizeBytes: formData.storageSizeBytes || 8 * 1024 * 1024 * 1024 },
        image: {
          path: formData.imagePath || '',
          format: formData.imageFormat || 'qcow2',
          architecture: formData.cpuArchitecture || 'x86_64',
        },
      }

      const id = addDevice(deviceData)
      success(t('deviceCreated'), t('deviceCreatedSuccessfully') || 'Device created successfully!')
      navigate(`/devices/${id}/live`)
    } catch (err) {
      error(t('error'), t('deviceCreateError') || 'Failed to create device')
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'name':
        return <StepName formData={formData} onChange={updateFormData} t={t} />
      case 'image':
        return <StepImage formData={formData} onChange={updateFormData} t={t} inspecting={inspecting} inspection={imageInspection} />
      case 'cpu':
        return <StepCPU formData={formData} onChange={updateFormData} t={t} />
      case 'memory':
        return <StepMemory formData={formData} onChange={updateFormData} t={t} />
      case 'storage':
        return <StepStorage formData={formData} onChange={updateFormData} t={t} />
      case 'display':
        return <StepDisplay formData={formData} onChange={updateFormData} t={t} />
      case 'graphics':
        return <StepGraphics formData={formData} onChange={updateFormData} t={t} />
      case 'audio':
        return <StepAudio formData={formData} onChange={updateFormData} t={t} />
      case 'network':
        return <StepNetwork formData={formData} onChange={updateFormData} t={t} />
      case 'advanced':
        return <StepAdvanced formData={formData} onChange={updateFormData} t={t} />
      case 'review':
        return <StepReview formData={formData} t={t} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-2">{t('deviceWizard')}</h1>
        <p className="body text-text-tertiary mt-1">{t('deviceWizardSubtitle') || 'Create a new virtual Android device'}</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id)
            const isActive = index === currentStepIndex
            const isFuture = index > currentStepIndex

            return (
              <div key={step.id} className="flex items-center gap-2 min-w-0 flex-shrink-0">
                <div className={clsx(
                  'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200',
                  isCompleted ? 'bg-status-success text-white' :
                  isActive ? 'bg-brand-600 text-white' :
                  'bg-surface-tertiary text-text-tertiary'
                )}>
                  {isCompleted ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span className={clsx(
                  'hidden sm:block text-sm font-medium transition-colors',
                  isActive ? 'text-text-primary' : 'text-text-tertiary'
                )}>
                  {t(step.label)}
                </span>
                {index < steps.length - 1 && (
                  <div className={clsx(
                    'hidden sm:block w-16 h-0.5 rounded transition-colors',
                    isCompleted ? 'bg-status-success' : 'bg-border-primary'
                  )} />
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile step indicator */}
        <div className="sm:hidden">
          <Progress value={((currentStepIndex + 1) / steps.length) * 100} className="h-2" />
          <p className="caption text-text-tertiary mt-1 text-center">
            {t('step')} {currentStepIndex + 1} {t('of')} {steps.length}: {t(steps[currentStepIndex].label)}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <Card className="card-hover">
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border-primary">
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={isFirstStep}
          className="flex-1 sm:flex-none"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </Button>

        <div className="flex gap-2 sm:ml-4">
          {isLastStep ? (
            <Button onClick={handleCreate} className="flex-1 sm:flex-none">
              <Smartphone className="w-4 h-4" />
              <span>{t('finish')}</span>
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1 sm:flex-none">
              <span>{t('next')}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Step Components
function StepName({ formData, onChange, t }: any) {
  return (
    <div className="space-y-6">
      <div>
        <label className="label">{t('deviceName')}</label>
        <Input
          placeholder={t('deviceNamePlaceholder')}
          value={formData.deviceName || ''}
          onChange={(e) => onChange({ deviceName: e.target.value })}
          hint={t('deviceNameHelp')}
        />
      </div>
      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-2">{t('tips') || 'Tips'}</h4>
        <ul className="space-y-1 text-sm text-text-secondary">
          <li>• {t('nameTip1') || 'Use a descriptive name like "Pixel 8 Pro" or "Test Device"'}</li>
          <li>• {t('nameTip2') || 'Avoid special characters for better compatibility'}</li>
          <li>• {t('nameTip3') || 'Names must be unique across devices'}</li>
        </ul>
      </div>
    </div>
  )
}

function StepImage({ formData, onChange, t, inspecting, inspection }: any) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange({ imagePath: file.path || URL.createObjectURL(file), imageName: file.name })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="label">{t('selectImage')}</label>
        <div className="relative">
          <Input
            placeholder={t('imagePathPlaceholder') || 'Select Android image file...'}
            value={formData.imagePath || formData.imageName || ''}
            readOnly
            rightIcon={<FileText className="w-5 h-5" />}
          />
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            accept=".img,.iso,.qcow2,.raw,.zip,.gz,.xz"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {inspection && (
        <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-text-primary">{t('compatibilityCheck')}</h4>
            <Badge variant={compatibilityLabels[inspection.compatibility as keyof typeof compatibilityLabels]?.variant || 'neutral'} dot>
              {t(compatibilityLabels[inspection.compatibility as keyof typeof compatibilityLabels]?.label || inspection.compatibility)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-tertiary">{t('format')}</p>
              <p className="font-medium text-text-primary">{inspection.format}</p>
            </div>
            <div>
              <p className="text-text-tertiary">{t('architecture')}</p>
              <p className="font-medium text-text-primary">{inspection.architecture}</p>
            </div>
            <div>
              <p className="text-text-tertiary">{t('size')}</p>
              <p className="font-medium text-text-primary">{formatBytes(inspection.sizeBytes)}</p>
            </div>
            <div>
              <p className="text-text-tertiary">{t('partitions')}</p>
              <p className="font-medium text-text-primary">{inspection.partitions?.length || 0}</p>
            </div>
          </div>

          {inspection.compatibilityNotes?.length > 0 && (
            <div className="mt-4">
              <p className="font-medium text-text-primary mb-2">{t('notes')}</p>
              <ul className="space-y-1 text-sm text-text-secondary">
                {inspection.compatibilityNotes.map((note: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inspecting && (
            <div className="mt-4 flex items-center gap-2 text-text-tertiary">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              {t('inspectingImage') || 'Inspecting image...'}
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-2">{t('supportedFormats') || 'Supported Formats'}</p>
        <div className="flex flex-wrap gap-2">
          {['RAW', 'QCOW2', 'ISO', 'IMG', 'ZIP', 'GZIP', 'XZ'].map(fmt => (
            <Badge key={fmt} variant="neutral" size="sm">{fmt}</Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepCPU({ formData, onChange, t }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t('cpuArchitecture') || 'Architecture'}
          value={formData.cpuArchitecture || 'x86_64'}
          onChange={(e) => onChange({ cpuArchitecture: e.target.value })}
        >
          <option value="x86_64">x86_64 (64-bit Intel/AMD)</option>
          <option value="arm64">ARM64 (64-bit ARM)</option>
          <option value="x86">x86 (32-bit Intel/AMD)</option>
          <option value="arm">ARM (32-bit ARM)</option>
        </Select>

        <Input
          label={t('cpuCores')}
          type="number"
          min={1}
          max={64}
          value={formData.cpuCores || 4}
          onChange={(e) => onChange({ cpuCores: parseInt(e.target.value) })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t('cpuThreads') || 'Threads per Core'}
          type="number"
          min={1}
          max={8}
          value={formData.cpuThreads || 1}
          onChange={(e) => onChange({ cpuThreads: parseInt(e.target.value) })}
        />

        <Select
          label={t('cpuModel') || 'CPU Model'}
          value={formData.cpuModel || 'host'}
          onChange={(e) => onChange({ cpuModel: e.target.value })}
        >
          <option value="host">{t('hostPassthrough') || 'Host Passthrough (Recommended)'}</option>
          <option value="max">{t('maxFeatures') || 'Max Features'}</option>
          <option value="Skylake-Client">Intel Skylake Client</option>
          <option value="Haswell">Intel Haswell</option>
          <option value="Broadwell">Intel Broadwell</option>
          <option value="EPYC">AMD EPYC</option>
          <option value="Neoverse-N1">ARM Neoverse N1</option>
        </Select>
      </div>

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-2">{t('cpuRecommendations') || 'Recommendations'}</h4>
        <ul className="space-y-1 text-sm text-text-secondary">
          <li>• {t('cpuTip1') || 'Match cores to your host CPU - don\'t allocate all cores'}</li>
          <li>• {t('cpuTip2') || 'For x86_64: 2-4 cores for low-end, 4-8 for balanced, 6-8 for performance'}</li>
          <li>• {t('cpuTip3') || 'ARM64 on x86_64 host uses slow TCG emulation - use fewer cores'}</li>
          <li>• {t('cpuTip4') || 'Leave 2+ cores for the host system'}</li>
        </ul>
      </div>
    </div>
  )
}

function StepMemory({ formData, onChange, t }: any) {
  return (
    <div className="space-y-6">
      <div>
        <label className="label">{t('memorySize') || 'Memory (RAM)'}</label>
        <div className="flex items-center gap-4">
          <Input
            type="number"
            min={512}
            max={65536}
            step={256}
            value={formData.memorySizeMB || 4096}
            onChange={(e) => onChange({ memorySizeMB: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-text-tertiary">MB</span>
        </div>
        <Progress
          value={(formData.memorySizeMB || 4096) / 65536 * 100}
          className="mt-2 h-1.5"
        />
        <p className="caption text-text-tertiary mt-1">
          {t('memoryHint') || 'Recommended: 2GB (low-end), 4GB (balanced), 8GB+ (performance)'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch
          label={t('enableBalloon') || 'Enable Memory Ballooning'}
          checked={formData.enableBalloon || false}
          onChange={(checked) => onChange({ enableBalloon: checked })}
          hint={t('balloonHint') || 'Allows dynamic memory allocation between host and guest'}
        />
        <Switch
          label={t('hugePages') || 'Use Huge Pages'}
          checked={formData.hugePages || false}
          onChange={(checked) => onChange({ hugePages: checked })}
          hint={t('hugePagesHint') || 'Improves memory performance, requires host support'}
        />
      </div>
    </div>
  )
}

function StepStorage({ formData, onChange, t }: any) {
  return (
    <div className="space-y-6">
      <div>
        <label className="label">{t('storageSize') || 'Storage Size'}</label>
        <div className="flex items-center gap-4">
          <Input
            type="number"
            min={1}
            max={2048}
            step={1}
            value={(formData.storageSizeBytes || 8 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024)}
            onChange={(e) => onChange({ storageSizeBytes: parseInt(e.target.value) * 1024 * 1024 * 1024 })}
            className="flex-1"
          />
          <span className="text-text-tertiary">GB</span>
        </div>
        <Progress
          value={(formData.storageSizeBytes || 8 * 1024 * 1024 * 1024) / (2048 * 1024 * 1024 * 1024) * 100}
          className="mt-2 h-1.5"
        />
        <p className="caption text-text-tertiary mt-1">
          {t('storageHint') || 'Recommended: 4GB (low-end), 8GB (balanced), 16GB+ (performance)'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t('storageFormat') || 'Format'}
          value={formData.storageFormat || 'qcow2'}
          onChange={(e) => onChange({ storageFormat: e.target.value })}
        >
          <option value="qcow2">QCOW2 (Recommended - snapshots, compression)</option>
          <option value="raw">RAW (Maximum compatibility)</option>
        </Select>

        <Select
          label={t('cacheMode') || 'Cache Mode'}
          value={formData.cacheMode || 'writeback'}
          onChange={(e) => onChange({ cacheMode: e.target.value })}
        >
          <option value="writeback">Writeback (Best performance)</option>
          <option value="writethrough">Writethrough (Safe)</option>
          <option value="none">None (Direct)</option>
          <option value="directsync">Direct Sync</option>
          <option value="unsafe">Unsafe (Fastest, risk of corruption)</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t('discard') || 'Discard/TRIM'}
          value={formData.discard || 'unmap'}
          onChange={(e) => onChange({ discard: e.target.value })}
        >
          <option value="unmap">UNMAP (Recommended)</option>
          <option value="ignore">Ignore</option>
        </Select>

        <Select
          label={t('detectZeroes') || 'Detect Zeroes'}
          value={formData.detectZeroes || 'on'}
          onChange={(e) => onChange({ detectZeroes: e.target.value })}
        >
          <option value="on">On (Recommended - saves space)</option>
          <option value="off">Off</option>
          <option value="unmap">UNMAP only</option>
        </Select>
      </div>
    </div>
  )
}

function StepDisplay({ formData, onChange, t }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label={t('displayWidth') || 'Width'}
          type="number"
          min={320}
          max={7680}
          value={formData.displayWidth || 1280}
          onChange={(e) => onChange({ displayWidth: parseInt(e.target.value) })}
        />
        <Input
          label={t('displayHeight') || 'Height'}
          type="number"
          min={240}
          max={4320}
          value={formData.displayHeight || 720}
          onChange={(e) => onChange({ displayHeight: parseInt(e.target.value) })}
        />
        <Input
          label={t('displayDPI') || 'DPI'}
          type="number"
          min={72}
          max={640}
          value={formData.displayDPI || 160}
          onChange={(e) => onChange({ displayDPI: parseInt(e.target.value) })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label={t('displayScale') || 'Scale'}
          type="number"
          min={0.5}
          max={3}
          step={0.25}
          value={formData.displayScale || 1.0}
          onChange={(e) => onChange({ displayScale: parseFloat(e.target.value) })}
        />

        <Select
          label={t('aspectRatio') || 'Aspect Ratio'}
          value={formData.aspectRatio || '16:9'}
          onChange={(e) => onChange({ aspectRatio: e.target.value })}
        >
          <option value="16:9">16:9 (Widescreen)</option>
          <option value="4:3">4:3 (Standard)</option>
          <option value="3:2">3:2 (Photography)</option>
          <option value="16:10">16:10 (MacBook)</option>
          <option value="9:16">9:16 (Phone Portrait)</option>
          <option value="free">Free (Custom)</option>
        </Select>

        <Input
          label={t('rotation') || 'Rotation'}
          type="number"
          min={0}
          max={270}
          step={90}
          value={formData.rotation || 0}
          onChange={(e) => onChange({ rotation: parseInt(e.target.value) })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Switch
          label={t('fullscreen') || 'Start in Fullscreen'}
          checked={formData.fullscreen || false}
          onChange={(checked) => onChange({ fullscreen: checked })}
        />
        <Switch
          label={t('vsync') || 'Vertical Sync'}
          checked={formData.vsync !== false}
          onChange={(checked) => onChange({ vsync: checked })}
        />
        <Switch
          label={t('showCursor') || 'Show Cursor'}
          checked={formData.showCursor !== false}
          onChange={(checked) => onChange({ showCursor: checked })}
        />
      </div>

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-2">{t('displayPresets') || 'Quick Presets'}</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { w: 1080, h: 1920, dpi: 420, label: 'Phone Portrait' },
            { w: 1920, h: 1080, dpi: 420, label: 'Phone Landscape' },
            { w: 1280, h: 720, dpi: 160, label: '720p' },
            { w: 1920, h: 1080, dpi: 240, label: '1080p' },
            { w: 2560, h: 1440, dpi: 320, label: '1440p' },
            { w: 3840, h: 2160, dpi: 320, label: '4K' },
          ].map(preset => (
            <Button
              key={`${preset.w}x${preset.h}`}
              variant="ghost"
              size="sm"
              onClick={() => onChange({ displayWidth: preset.w, displayHeight: preset.h, displayDPI: preset.dpi })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepGraphics({ formData, onChange, t }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t('graphicsDevice') || 'Graphics Device'}
          value={formData.graphicsDevice || 'virtio-gpu-pci'}
          onChange={(e) => onChange({ graphicsDevice: e.target.value })}
        >
          <option value="virtio-gpu-pci">virtio-gpu-pci (Recommended - Linux guest)</option>
          <option value="virtio-gpu-gl-pci">virtio-gpu-gl-pci (OpenGL)</option>
          <option value="virtio-vga">virtio-vga (Basic 2D)</option>
          <option value="qxl">QXL (Legacy)</option>
        </Select>

        <Select
          label={t('graphicsRenderer') || 'Renderer'}
          value={formData.graphicsRenderer || 'auto'}
          onChange={(e) => onChange({ graphicsRenderer: e.target.value })}
        >
          <option value="auto">Auto</option>
          <option value="virgl">VirGL (OpenGL)</option>
          <option value="venus">Venus (Vulkan - Experimental)</option>
          <option value="software">Software</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Switch
          label={t('enable3D') || 'Enable 3D'}
          checked={formData.enable3D !== false}
          onChange={(checked) => onChange({ enable3D: checked })}
        />
        <Switch
          label={t('enableVirgl') || 'Enable Virgil3D'}
          checked={formData.enableVirgl !== false}
          onChange={(checked) => onChange({ enableVirgl: checked })}
        />
        <Switch
          label={t('enableGlSl') || 'Enable GLSL'}
          checked={formData.enableGlSl !== false}
          onChange={(checked) => onChange({ enableGlSl: checked })}
        />
      </div>

      <div>
        <label className="label">{t('vramSize') || 'VRAM (MB)'}</label>
        <Input
          type="number"
          min={64}
          max={4096}
          step={64}
          value={formData.vramSize || 256}
          onChange={(e) => onChange({ vramSize: parseInt(e.target.value) })}
        />
      </div>

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-2">{t('graphicsNotes') || 'Important Notes'}</h4>
        <ul className="space-y-1 text-sm text-text-secondary">
          <li>• {t('gfxNote1') || 'virtio-gpu works best with Linux/Android guests (mature driver)'}</li>
          <li>• {t('gfxNote2') || 'VirGL requires host OpenGL support - may not work on all GPUs'}</li>
          <li>• {t('gfxNote3') || 'Venus/Vulkan is experimental on Windows hosts'}</li>
          <li>• {t('gfxNote4') || 'GPU passthrough requires dedicated GPU and IOMMU (not implemented)'}</li>
        </ul>
      </div>
    </div>
  )
}

function StepAudio({ formData, onChange, t }: any) {
  return (
    <div className="space-y-6">
      <Switch
        label={t('audioEnabled') || 'Enable Audio'}
        checked={formData.audioEnabled !== false}
        onChange={(checked) => onChange({ audioEnabled: checked })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t('audioDevice') || 'Audio Device'}
          value={formData.audioDevice || 'pa'}
          onChange={(e) => onChange({ audioDevice: e.target.value })}
        >
          <option value="pa">PulseAudio (Recommended)</option>
          <option value="spice">SPICE</option>
          <option value="none">None</option>
        </Select>

        <Input
          label={t('sampleRate') || 'Sample Rate'}
          type="number"
          value={formData.sampleRate || 48000}
          onChange={(e) => onChange({ sampleRate: parseInt(e.target.value) })}
        />
      </div>
    </div>
  )
}

function StepNetwork({ formData, onChange, t }: any) {
  const portForwards = formData.portForwards || [
    { protocol: 'tcp', hostPort: 5555, guestPort: 5555, guestIP: '' },
  ]

  return (
    <div className="space-y-6">
      <Select
        label={t('networkMode') || 'Network Mode'}
        value={formData.networkMode || 'user'}
        onChange={(e) => onChange({ networkMode: e.target.value })}
      >
        <option value="user">{t('userMode') || 'User Mode (NAT) - Recommended'}</option>
        <option value="tap">{t('tapMode') || 'TAP - Requires Admin'}</option>
        <option value="bridge">{t('bridgeMode') || 'Bridge - Requires Admin'}</option>
        <option value="none">{t('noNetwork') || 'No Network'}</option>
      </Select>

      <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h4 className="font-medium text-text-primary mb-3">{t('portForwards') || 'Port Forwards'}</h4>
        <div className="space-y-2">
          {portForwards.map((pf: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={pf.protocol}
                onChange={(e) => {
                  const newForwards = [...portForwards]
                  newForwards[index] = { ...pf, protocol: e.target.value }
                  onChange({ portForwards: newForwards })
                }}
                className="w-24"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </Select>
              <Input
                type="number"
                placeholder="Host Port"
                value={pf.hostPort}
                onChange={(e) => {
                  const newForwards = [...portForwards]
                  newForwards[index] = { ...pf, hostPort: parseInt(e.target.value) }
                  onChange({ portForwards: newForwards })
                }}
                className="w-32"
              />
              <span className="text-text-tertiary">→</span>
              <Input
                type="number"
                placeholder="Guest Port"
                value={pf.guestPort}
                onChange={(e) => {
                  const newForwards = [...portForwards]
                  newForwards[index] = { ...pf, guestPort: parseInt(e.target.value) }
                  onChange({ portForwards: newForwards })
                }}
                className="w-32"
              />
              <Button variant="ghost" size="icon" onClick={() => {
                const newForwards = portForwards.filter((_: any, i: number) => i !== index)
                onChange({ portForwards: newForwards })
              }}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => {
            onChange({ portForwards: [...portForwards, { protocol: 'tcp', hostPort: 0, guestPort: 0, guestIP: '' }] })
          }}>
            <RotateCcw className="w-4 h-4" />
            <span>{t('addPortForward') || 'Add Port Forward'}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch
          label={t('enableIPv6') || 'Enable IPv6'}
          checked={formData.enableIPv6 || false}
          onChange={(checked) => onChange({ enableIPv6: checked })}
        />
        <Switch
          label={t('isolateNetwork') || 'Isolate Network'}
          checked={formData.isolateNetwork || false}
          onChange={(checked) => onChange({ isolateNetwork: checked })}
        />
      </div>
    </div>
  )
}

function StepAdvanced({ formData, onChange, t }: any) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg">
        <h4 className="font-medium text-status-warning mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {t('advancedWarning') || 'Advanced Settings'}
        </h4>
        <p className="text-sm text-text-secondary">
          {t('advancedWarningText') || 'These settings can affect stability. Only change if you know what you\'re doing.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Switch
          label={t('enableDebug') || 'Enable Debug Logging'}
          checked={formData.enableDebug || false}
          onChange={(checked) => onChange({ enableDebug: checked })}
        />
        <Switch
          label={t('enableGuestAgent') || 'Enable Guest Agent'}
          checked={formData.enableGuestAgent !== false}
          onChange={(checked) => onChange({ enableGuestAgent: checked })}
        />
        <Switch
          label={t('balloonMemory') || 'Memory Ballooning'}
          checked={formData.balloonMemory || false}
          onChange={(checked) => onChange({ balloonMemory: checked })}
        />
        <Switch
          label={t('ioThread') || 'IO Thread'}
          checked={formData.ioThread !== false}
          onChange={(checked) => onChange({ ioThread: checked })}
        />
      </div>

      <div>
        <label className="label">{t('extraArgs') || 'Extra QEMU Arguments'}</label>
        <Input
          placeholder="-device ... -object ..."
          value={formData.extraArgs?.join(' ') || ''}
          onChange={(e) => onChange({ extraArgs: e.target.value.split(' ').filter(Boolean) })}
        />
      </div>
    </div>
  )
}

function StepReview({ formData, t }: any) {
  return (
    <div className="space-y-6">
      <h3 className="heading-5">{t('reviewConfig')}</h3>

      <div className="space-y-4">
        <ReviewSection title={t('basic') || 'Basic'} items={[
          { label: t('deviceName'), value: formData.deviceName },
          { label: t('androidImage'), value: formData.imageName || formData.imagePath },
          { label: t('architecture'), value: formData.cpuArchitecture },
        ]} />

        <ReviewSection title={t('cpu') || 'CPU'} items={[
          { label: t('cpuCores'), value: formData.cpuCores },
          { label: t('cpuThreads'), value: formData.cpuThreads },
          { label: t('cpuModel'), value: formData.cpuModel },
        ]} />

        <ReviewSection title={t('memory') || 'Memory'} items={[
          { label: t('memorySize'), value: `${formData.memorySizeMB} MB` },
          { label: t('enableBalloon'), value: formData.enableBalloon ? t('yes') : t('no') },
        ]} />

        <ReviewSection title={t('storage') || 'Storage'} items={[
          { label: t('storageSize'), value: formatBytes(formData.storageSizeBytes) },
          { label: t('storageFormat'), value: formData.storageFormat },
          { label: t('cacheMode'), value: formData.cacheMode },
        ]} />

        <ReviewSection title={t('display') || 'Display'} items={[
          { label: t('resolution'), value: `${formData.displayWidth}x${formData.displayHeight}` },
          { label: t('displayDPI'), value: formData.displayDPI },
          { label: t('fullscreen'), value: formData.fullscreen ? t('yes') : t('no') },
        ]} />

        <ReviewSection title={t('graphics') || 'Graphics'} items={[
          { label: t('graphicsDevice'), value: formData.graphicsDevice },
          { label: t('graphicsRenderer'), value: formData.graphicsRenderer },
          { label: t('enable3D'), value: formData.enable3D ? t('yes') : t('no') },
          { label: t('vramSize'), value: `${formData.vramSize} MB` },
        ]} />

        <ReviewSection title={t('network') || 'Network'} items={[
          { label: t('networkMode'), value: formData.networkMode },
          { label: t('portForwards'), value: formData.portForwards?.length + ' rules' },
        ]} />
      </div>
    </div>
  )
}

function ReviewSection({ title, items }: { title: string; items: { label: string; value: any }[] }) {
  return (
    <div className="p-4 bg-surface-secondary rounded-lg border border-border-primary">
      <h4 className="font-medium text-text-primary mb-3 pb-2 border-b border-border-primary">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-text-tertiary">{item.label}</span>
            <span className="font-medium text-text-primary text-right truncate max-w-[60%]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}