import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Cpu,
  Layers,
  Database,
  Wifi,
  HardDrive,
  Download,
  Package,
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Terminal,
  Filter,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible'
import { useSystemStore } from '@/hooks/useSystemStore'
import { useToast } from '@/components/ui/Toaster'

const categories = [
  { id: 'virtualization', label: 'virtualization', icon: Cpu, checks: ['whpx', 'tcg', 'hyperv', 'nested'] },
  { id: 'graphics', label: 'graphics', icon: Layers, checks: ['device', 'renderer', 'opengl', 'vulkan'] },
  { id: 'storage', label: 'storage', icon: Database, checks: ['space', 'format', 'permissions', 'speed'] },
  { id: 'network', label: 'network', icon: Wifi, checks: ['userMode', 'tap', 'bridge', 'dns'] },
  { id: 'images', label: 'images', icon: HardDrive, checks: ['format', 'compatibility', 'integrity', 'kernels'] },
  { id: 'dependencies', label: 'dependencies', icon: Package, checks: ['qemu', 'webview2', 'drivers', 'updates'] },
  { id: 'performance', label: 'performance', icon: Activity, checks: ['cpu', 'memory', 'thermal', 'throttling'] },
]

const checkDetails: Record<string, { name: string; description: string }> = {
  whpx: { name: 'WHPX Support', description: 'Windows Hypervisor Platform hardware acceleration' },
  tcg: { name: 'TCG Emulation', description: 'Software fallback when hardware acceleration unavailable' },
  hyperv: { name: 'Hyper-V Status', description: 'Hyper-V enabled - may conflict with WHPX' },
  nested: { name: 'Nested Virtualization', description: 'Running VMs inside VMs (not supported on WHPX)' },
  device: { name: 'Graphics Device', description: 'virtio-gpu-pci or compatible display device' },
  renderer: { name: 'Renderer', description: 'VirGL, Venus, or software renderer' },
  opengl: { name: 'OpenGL Support', description: 'Host OpenGL driver for VirGL rendering' },
  vulkan: { name: 'Vulkan Support', description: 'Host Vulkan driver for Venus renderer' },
  space: { name: 'Disk Space', description: 'Sufficient space for VM images and snapshots' },
  format: { name: 'Image Format', description: 'Supported formats: QCOW2, RAW, ISO' },
  permissions: { name: 'File Permissions', description: 'Read/write access to image and working directories' },
  speed: { name: 'Disk Speed', description: 'SSD recommended for best performance' },
  userMode: { name: 'User Mode Network', description: 'NAT networking with port forwarding' },
  tap: { name: 'TAP Interface', description: 'TAP networking (requires admin)' },
  bridge: { name: 'Bridge Network', description: 'Bridge networking (requires admin)' },
  dns: { name: 'DNS Resolution', description: 'Guest DNS configuration' },
  compatibility: { name: 'Image Compatibility', description: 'Android image compatibility classification' },
  integrity: { name: 'Image Integrity', description: 'File checksum verification' },
  kernels: { name: 'Kernel Availability', description: 'Matching kernel/initramfs for GSI images' },
  qemu: { name: 'QEMU Binary', description: 'QEMU 7.0+ with WHPX support' },
  webview2: { name: 'WebView2 Runtime', description: 'Microsoft Edge WebView2 for UI' },
  drivers: { name: 'VirtIO Drivers', description: 'Guest VirtIO drivers for storage/network' },
  updates: { name: 'Component Updates', description: 'Available updates for QEMU and dependencies' },
  cpu: { name: 'CPU Resources', description: 'Available CPU cores and frequency' },
  memory: { name: 'Memory Resources', description: 'Available RAM for VM allocation' },
  thermal: { name: 'Thermal State', description: 'CPU/GPU temperature monitoring' },
  throttling: { name: 'Throttling Detection', description: 'Performance throttling detection' },
}

type CheckStatus = 'pass' | 'warn' | 'fail' | 'info' | 'unknown'

interface DiagnosticCheck {
  id: string
  name: string
  description: string
  status: CheckStatus
  message: string
  recommendation?: string
  autoFixable?: boolean
}

const mockChecks: Record<string, DiagnosticCheck[]> = {
  virtualization: [
    { id: 'whpx', name: 'WHPX Support', description: 'Windows Hypervisor Platform hardware acceleration', status: 'pass', message: 'WHPX is available and enabled', recommendation: 'No action needed' },
    { id: 'tcg', name: 'TCG Emulation', description: 'Software fallback when hardware acceleration unavailable', status: 'pass', message: 'TCG is always available', recommendation: 'No action needed' },
    { id: 'hyperv', name: 'Hyper-V Status', description: 'Hyper-V enabled - may conflict with WHPX', status: 'warn', message: 'Hyper-V is enabled', recommendation: 'Disable Hyper-V if WHPX issues occur' },
    { id: 'nested', name: 'Nested Virtualization', description: 'Running VMs inside VMs (not supported on WHPX)', status: 'info', message: 'Not supported on WHPX', recommendation: 'Use dedicated hardware for nested virtualization' },
  ],
  graphics: [
    { id: 'device', name: 'Graphics Device', description: 'virtio-gpu-pci or compatible display device', status: 'pass', message: 'virtio-gpu-pci configured', recommendation: 'Recommended for Linux/Android guests' },
    { id: 'renderer', name: 'Renderer', description: 'VirGL, Venus, or software renderer', status: 'pass', message: 'VirGL renderer available', recommendation: 'Ensure host GPU drivers are updated' },
    { id: 'opengl', name: 'OpenGL Support', description: 'Host OpenGL driver for VirGL rendering', status: 'warn', message: 'OpenGL 4.6 detected', recommendation: 'Update GPU drivers for best VirGL performance' },
    { id: 'vulkan', name: 'Vulkan Support', description: 'Host Vulkan driver for Venus renderer', status: 'fail', message: 'Vulkan not available', recommendation: 'Install Vulkan SDK or update GPU drivers' },
  ],
  storage: [
    { id: 'space', name: 'Disk Space', description: 'Sufficient space for VM images and snapshots', status: 'pass', message: '245 GB free of 512 GB', recommendation: 'No action needed' },
    { id: 'format', name: 'Image Format', description: 'Supported formats: QCOW2, RAW, ISO', status: 'pass', message: 'All formats supported', recommendation: 'Use QCOW2 for snapshots and compression' },
    { id: 'permissions', name: 'File Permissions', description: 'Read/write access to image and working directories', status: 'pass', message: 'Permissions OK', recommendation: 'No action needed' },
    { id: 'speed', name: 'Disk Speed', description: 'SSD recommended for best performance', status: 'pass', message: 'NVMe SSD detected', recommendation: 'Optimal for VM performance' },
  ],
  network: [
    { id: 'userMode', name: 'User Mode Network', description: 'NAT networking with port forwarding', status: 'pass', message: 'User mode networking configured', recommendation: 'ADB port 5555 forwarded' },
    { id: 'tap', name: 'TAP Interface', description: 'TAP networking (requires admin)', status: 'info', message: 'Not configured', recommendation: 'Enable in device settings if needed' },
    { id: 'bridge', name: 'Bridge Network', description: 'Bridge networking (requires admin)', status: 'info', message: 'Not configured', recommendation: 'Enable in device settings if needed' },
    { id: 'dns', name: 'DNS Resolution', description: 'Guest DNS configuration', status: 'pass', message: 'Using 8.8.8.8, 8.8.4.4', recommendation: 'Custom DNS can be configured per device' },
  ],
  images: [
    { id: 'format', name: 'Image Format', description: 'Supported formats: QCOW2, RAW, ISO', status: 'pass', message: '2 images found: 1 QCOW2, 1 ISO', recommendation: 'No action needed' },
    { id: 'compatibility', name: 'Image Compatibility', description: 'Android image compatibility classification', status: 'warn', message: '1 full, 1 config required', recommendation: 'Review image inspection results' },
    { id: 'integrity', name: 'Image Integrity', description: 'File checksum verification', status: 'pass', message: 'All images verified', recommendation: 'Run verification periodically' },
    { id: 'kernels', name: 'Kernel Availability', description: 'Matching kernel/initramfs for GSI images', status: 'fail', message: 'GSI images missing kernels', recommendation: 'Download matching kernel/initramfs or use prebuilt images' },
  ],
  dependencies: [
    { id: 'qemu', name: 'QEMU Binary', description: 'QEMU 7.0+ with WHPX support', status: 'pass', message: 'QEMU 9.0.1 detected', recommendation: 'Latest stable version' },
    { id: 'webview2', name: 'WebView2 Runtime', description: 'Microsoft Edge WebView2 for UI', status: 'pass', message: 'WebView2 125.0.2535.51', recommendation: 'Auto-updated with Windows' },
    { id: 'drivers', name: 'VirtIO Drivers', description: 'Guest VirtIO drivers for storage/network', status: 'warn', message: 'Drivers included in modern kernels', recommendation: 'Guest OS handles driver loading' },
    { id: 'updates', name: 'Component Updates', description: 'Available updates for QEMU and dependencies', status: 'info', message: 'All components up to date', recommendation: 'Check for updates weekly' },
  ],
  performance: [
    { id: 'cpu', name: 'CPU Resources', description: 'Available CPU cores and frequency', status: 'pass', message: '8 cores @ 3.6 GHz', recommendation: 'Allocating 4-6 cores for VMs is optimal' },
    { id: 'memory', name: 'Memory Resources', description: 'Available RAM for VM allocation', status: 'pass', message: '16 GB total, 8 GB available', recommendation: 'Reserve 4-8 GB for host' },
    { id: 'thermal', name: 'Thermal State', description: 'CPU/GPU temperature monitoring', status: 'info', message: 'CPU 42°C, GPU 38°C', recommendation: 'Normal operating temperatures' },
    { id: 'throttling', name: 'Throttling Detection', description: 'Performance throttling detection', status: 'pass', message: 'No throttling detected', recommendation: 'Ensure adequate cooling for sustained loads' },
  ],
}

export function Diagnostics() {
  const { t } = useTranslation()
  const { runDiagnostics, virtualizationStatus } = useSystemStore()
  const { success, info } = useToast()
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['virtualization'])
  const [filterStatus, setFilterStatus] = useState<CheckStatus | 'all'>('all')
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  const allChecks = Object.entries(mockChecks).flatMap(([category, checks]) =>
    checks.map(check => ({ ...check, category }))
  )

  const filteredChecks = filterStatus === 'all'
    ? allChecks
    : allChecks.filter(c => c.status === filterStatus)

  const statusCounts = allChecks.reduce((acc, check) => {
    acc[check.status] = (acc[check.status] || 0) + 1
    return acc
  }, {} as Record<CheckStatus, number>)

  const handleRunDiagnostics = async () => {
    setRunning(true)
    await runDiagnostics()
    setLastRun(new Date())
    setRunning(false)
    success(t('diagnosticsComplete'), t('diagnosticsCompleteMessage'))
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    )
  }

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-status-success" />
      case 'warn': return <AlertTriangle className="w-4 h-4 text-status-warning" />
      case 'fail': return <AlertCircle className="w-4 h-4 text-status-error" />
      case 'info': return <Info className="w-4 h-4 text-status-info" />
      default: return <AlertCircle className="w-4 h-4 text-text-tertiary" />
    }
  }

  const getStatusBadge = (status: CheckStatus) => {
    const variants: Record<CheckStatus, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
      pass: 'success',
      warn: 'warning',
      fail: 'error',
      info: 'info',
      unknown: 'neutral',
    }
    return <Badge variant={variants[status]} dot>{t(status)}</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-2">{t('diagnosticsTitle')}</h1>
          <p className="body text-text-tertiary mt-1">{t('diagnosticsSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleRunDiagnostics} loading={running}>
            <RefreshCw className={clsx('w-4 h-4', running && 'animate-spin')} />
            <span>{running ? t('running') : t('runDiagnostics')}</span>
          </Button>
          <Button variant="ghost">
            <FileText className="w-4 h-4" />
            <span>{t('exportReport')}</span>
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <Card className="card-hover">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryStat
              label={t('totalChecks') || 'Total Checks'}
              value={allChecks.length}
              icon={Activity}
              color="brand"
            />
            <SummaryStat
              label={t('pass') || 'Pass'}
              value={statusCounts.pass || 0}
              icon={CheckCircle}
              color="green"
            />
            <SummaryStat
              label={t('warn') || 'Warnings'}
              value={statusCounts.warn || 0}
              icon={AlertTriangle}
              color="orange"
            />
            <SummaryStat
              label={t('fail') || 'Failed'}
              value={statusCounts.fail || 0}
              icon={AlertCircle}
              color="red"
            />
            <SummaryStat
              label={t('info') || 'Info'},
              value={statusCounts.info || 0}
              icon={Info}
              color="blue"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(['all', 'pass', 'warn', 'fail', 'info'] as const).map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="gap-1"
              >
                {status !== 'all' && getStatusIcon(status)}
                <span>{t(status)}</span>
                {status !== 'all' && statusCounts[status] > 0 && (
                  <Badge variant="neutral" className="ml-1">{statusCounts[status]}</Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Virtualization Status Card */}
      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-600" />
            {t('virtualizationEngineStatus')}
          </CardTitle>
          <Badge variant={virtualizationStatus.available ? 'success' : 'error'} dot>
            {virtualizationStatus.available ? t('available') : t('unavailable')}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusRow label={t('engine')} value={virtualizationStatus.engine} />
            <StatusRow label={t('acceleration')} value={virtualizationStatus.acceleration} />
            <StatusRow label={t('recommended')} value={virtualizationStatus.recommended} />
            <StatusRow label={t('whpx')} value={virtualizationStatus.whpxSupported ? t('yes') : t('no')} />
          </div>
          {virtualizationStatus.conflicts.length > 0 && (
            <div className="mt-4 p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg">
              <h4 className="font-medium text-status-warning mb-2">{t('conflicts')}</h4>
              <ul className="space-y-1 text-sm text-text-secondary">
                {virtualizationStatus.conflicts.map((conflict, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {conflict}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnostic Categories */}
      <div className="space-y-4">
        {categories.map(category => {
          const checks = mockChecks[category.id] || []
          const categoryChecks = filterStatus === 'all'
            ? checks
            : checks.filter(c => c.status === filterStatus)

          if (categoryChecks.length === 0 && filterStatus !== 'all') return null

          const categoryStatus = checks.reduce((worst, check) => {
            const severity = { fail: 4, warn: 3, info: 2, pass: 1, unknown: 0 }
            return severity[check.status] > severity[worst] ? check.status : worst
          }, 'pass' as CheckStatus)

          return (
            <Card key={category.id} className="card-hover">
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <category.icon className="w-5 h-5 text-brand-600" />
                    <h3 className="font-semibold text-text-primary">{t(category.label)}</h3>
                    <Badge variant={categoryStatus === 'pass' ? 'success' : categoryStatus === 'warn' ? 'warning' : categoryStatus === 'fail' ? 'error' : 'info'} dot>
                      {t(categoryStatus)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-tertiary">
                      {categoryChecks.length} / {checks.length}
                    </span>
                    {expandedCategories.includes(category.id) ? (
                      <ChevronUp className="w-5 h-5 text-text-tertiary" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-text-tertiary" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <Collapsible open={expandedCategories.includes(category.id)}>
                <CollapsibleContent className="p-4 pt-0">
                  <div className="space-y-3">
                    {categoryChecks.map(check => (
                      <DiagnosticCheckItem
                        key={check.id}
                        check={check}
                        onAutoFix={() => info(t('autoFixApplied'), `${check.name} ${t('fixed')}`)}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>

      {filteredChecks.length === 0 && filterStatus !== 'all' && (
        <div className="empty-state">
          <CheckCircle className="empty-state-icon text-status-success" />
          <h3 className="empty-state-title">{t('noIssuesFound')}</h3>
          <p className="empty-state-description">{t('noIssuesFoundDesc')}</p>
        </div>
      )}
    </div>
  )
}

// Summary Stat Component
function SummaryStat({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colorClasses = {
    brand: 'bg-brand-500/10 text-brand-600',
    green: 'bg-status-success/10 text-status-success',
    orange: 'bg-status-warning/10 text-status-warning',
    red: 'bg-status-error/10 text-status-error',
    blue: 'bg-status-info/10 text-status-info',
  }

  return (
    <div className="text-center p-4">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2', colorClasses[color as keyof typeof colorClasses])}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="heading-4 font-mono text-text-primary">{value}</p>
      <p className="caption text-text-tertiary">{label}</p>
    </div>
  )
}

// Status Row Component
function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="caption text-text-tertiary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  )
}

// Diagnostic Check Item Component
function DiagnosticCheckItem({ check, onAutoFix }: { check: { id: string; name: string; description: string; status: string; message: string; recommendation?: string; autoFixable?: boolean }; onAutoFix: () => void }) {
  const status = check.status as 'pass' | 'warn' | 'fail' | 'info' | 'unknown'

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-status-success" />
      case 'warn': return <AlertTriangle className="w-5 h-5 text-status-warning" />
      case 'fail': return <AlertCircle className="w-5 h-5 text-status-error" />
      case 'info': return <Info className="w-5 h-5 text-status-info" />
      default: return <AlertCircle className="w-5 h-5 text-text-tertiary" />
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon(status)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-text-primary">{check.name}</h4>
          <Badge variant={status === 'pass' ? 'success' : status === 'warn' ? 'warning' : status === 'fail' ? 'error' : 'info'} dot>
            {status}
          </Badge>
        </div>
        <p className="text-sm text-text-secondary mt-0.5">{check.message}</p>
        <p className="text-xs text-text-tertiary mt-1">{check.description}</p>
        {check.recommendation && (
          <p className="text-sm text-brand-600 mt-2 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>{check.recommendation}</span>
          </p>
        )}
        {check.autoFixable && (
          <Button variant="ghost" size="sm" onClick={onAutoFix} className="mt-2">
            🔧 {status === 'fail' ? 'Auto-fix' : 'Apply'}
          </Button>
        )}
      </div>
    </div>
  )
}