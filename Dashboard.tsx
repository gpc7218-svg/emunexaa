import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import {
  Smartphone,
  PlusCircle,
  Upload,
  Cpu,
  MemoryStick,
  Database,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  TrendingUp,
  Clock,
  Play,
  Pause,
  StopCircle,
  MoreVertical,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { useDeviceStore } from '@/hooks/useDeviceStore'
import { useSystemStore } from '@/hooks/useSystemStore'
import { formatBytes, formatUptime } from '@/utils/formatters'

export function Dashboard() {
  const { t } = useTranslation()
  const { devices, getRecentDevices } = useDeviceStore()
  const { systemStats, virtualizationStatus, runDiagnostics } = useSystemStore()

  const recentDevices = getRecentDevices(4)
  const runningDevices = devices.filter(d => d.status === 'running')
  const totalDevices = devices.length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-2">{t('welcome')}</h1>
          <p className="body text-text-tertiary mt-1">{t('welcomeSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <NavLink to="/import" className="btn-secondary">
            <Upload className="w-4 h-4" />
            <span>{t('importImage')}</span>
          </NavLink>
          <NavLink to="/devices/create" className="btn-primary">
            <PlusCircle className="w-4 h-4" />
            <span>{t('createDevice')}</span>
          </NavLink>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('devices')}
          value={totalDevices}
          icon={Smartphone}
          color="brand"
          trend={runningDevices.length > 0 ? `${runningDevices.length} ${t('running')}` : undefined}
        />
        <StatCard
          title={t('cpuUsage')}
          value={`${systemStats.cpuUsage}%`}
          icon={Cpu}
          color="orange"
          progress={systemStats.cpuUsage / 100}
        />
        <StatCard
          title={t('memoryUsage')}
          value={`${systemStats.memoryUsage}%`}
          icon={MemoryStick}
          color="blue"
          progress={systemStats.memoryUsage / 100}
        />
        <StatCard
          title={t('storageUsage')}
          value={`${systemStats.storageUsage}%`}
          icon={Database}
          color="green"
          progress={systemStats.storageUsage / 100}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Virtualization Status & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Virtualization Engine Status */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-600" />
                {t('virtualizationEngine')}
              </CardTitle>
              <Badge variant={virtualizationStatus.available ? 'success' : 'error'}>
                {virtualizationStatus.available ? t('running') : t('error')}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <StatusRow
                  label={t('engineStatus')}
                  value={virtualizationStatus.engine}
                  icon={Activity}
                />
                <StatusRow
                  label={t('acceleration')}
                  value={virtualizationStatus.acceleration}
                  icon={TrendingUp}
                />
                <StatusRow
                  label={t('recommendedAccel') || 'Recommended'}
                  value={virtualizationStatus.recommended}
                  icon={CheckCircle}
                />
              </div>

              <div className="pt-4 border-t border-border-primary">
                <Button className="w-full" variant="secondary" onClick={runDiagnostics}>
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('runDiagnostics')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>{t('quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickAction
                icon={PlusCircle}
                label={t('createDevice')}
                description={t('createFirstDevice') || 'Create a new virtual device'}
                href="/devices/create"
              />
              <QuickAction
                icon={Upload}
                label={t('importImage')}
                description="Import Android system image"
                href="/import"
              />
              <QuickAction
                icon={Activity}
                label={t('diagnostics')}
                description="Run system diagnostics"
                href="/diagnostics"
              />
              <QuickAction
                icon=ExternalLink
                label={t('settings')}
                description="Configure EmuNexa"
                href="/settings"
              />
            </CardContent>
          </Card>
        </div>

        {/* Recent Devices & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Devices */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('recentDevices')}</CardTitle>
              <NavLink to="/devices" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                {t('viewAll')} <ExternalLink className="w-3 h-3 inline" />
              </NavLink>
            </CardHeader>
            <CardContent>
              {recentDevices.length === 0 ? (
                <div className="empty-state">
                  <Smartphone className="empty-state-icon" />
                  <h3 className="empty-state-title">{t('noDevicesYet')}</h3>
                  <p className="empty-state-description">{t('createFirstDevice')}</p>
                  <NavLink to="/devices/create" className="btn-primary mt-4">
                    <PlusCircle className="w-4 h-4" />
                    <span>{t('createFirstDevice')}</span>
                  </NavLink>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDevices.map((device) => (
                    <DeviceCard key={device.id} device={device} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>{t('recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: 'brand' | 'orange' | 'blue' | 'green' | 'red' | 'purple'
  trend?: string
  progress?: number
}

const colorClasses = {
  brand: 'bg-brand-500/10 text-brand-600',
  orange: 'bg-orange-500/10 text-orange-600',
  blue: 'bg-blue-500/10 text-blue-600',
  green: 'bg-green-500/10 text-green-600',
  red: 'bg-red-500/10 text-red-600',
  purple: 'bg-purple-500/10 text-purple-600',
}

function StatCard({ title, value, icon: Icon, color, trend, progress }: StatCardProps) {
  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="caption text-text-tertiary uppercase tracking-wide">{title}</p>
            <p className="heading-4 mt-1 font-mono">{value}</p>
            {trend && (
              <p className="caption text-text-tertiary mt-2">{trend}</p>
            )}
          </div>
          <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {progress !== undefined && (
          <Progress value={progress * 100} className="mt-4 h-1.5" />
        )}
      </CardContent>
    </Card>
  )
}

// Status Row Component
interface StatusRowProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}

function StatusRow({ label, value, icon: Icon }: StatusRowProps) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-text-tertiary" />
      <div className="flex-1">
        <p className="caption text-text-tertiary">{label}</p>
        <p className="body-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  )
}

// Quick Action Component
interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  href: string
}

function QuickAction({ icon: Icon, label, description, href }: QuickActionProps) {
  return (
    <NavLink
      to={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-surface-tertiary flex items-center justify-center text-text-secondary group-hover:text-brand-600 group-hover:bg-brand-500/10 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="body-sm font-medium text-text-primary">{label}</p>
        <p className="caption text-text-tertiary truncate">{description}</p>
      </div>
    </NavLink>
  )
}

// Device Card Component
interface DeviceCardProps {
  device: {
    id: string
    name: string
    status: string
    cpu: { cores: number }
    memory: { sizeMB: number }
    storage: { sizeBytes: number }
    lastUsedAt?: Date
    architecture: string
  }
}

function DeviceCard({ device }: DeviceCardProps) {
  const statusColors = {
    running: 'success',
    stopped: 'neutral',
    paused: 'warning',
    error: 'error',
  } as const

  const statusIcons = {
    running: Play,
    stopped: StopCircle,
    paused: Pause,
    error: AlertTriangle,
  }

  const StatusIcon = statusIcons[device.status as keyof typeof statusIcons] || StopCircle
  const statusVariant = statusColors[device.status as keyof typeof statusColors] || 'neutral'

  return (
    <NavLink
      to={`/devices/${device.id}/live`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-hover transition-colors group"
    >
      <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
        <Smartphone className="w-6 h-6 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-text-primary truncate">{device.name}</h4>
          <Badge variant={statusVariant} className="flex items-center gap-1">
            <StatusIcon className="w-3 h-3" />
            {device.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-4 mt-1 text-text-tertiary text-sm">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" />
            {device.cpu.cores} {t('cpuCores') || 'cores'}
          </span>
          <span className="flex items-center gap-1">
            <MemoryStick className="w-3.5 h-3.5" />
            {device.memory.sizeMB} MB
          </span>
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            {formatBytes(device.storage.sizeBytes)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-text-tertiary">
        {device.lastUsedAt && (
          <span className="caption hidden sm:block">{formatUptime(device.lastUsedAt)}</span>
        )}
        <MoreVertical className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </NavLink>
  )
}

// Activity Feed Component
function ActivityFeed() {
  const activities = [
    { time: '2 min ago', action: 'Device "Pixel 8 Pro" started', type: 'success' },
    { time: '15 min ago', action: 'Image "lineage-21.0-x86_64.img" imported', type: 'info' },
    { time: '1 hour ago', action: 'Device "Test Device" created', type: 'info' },
    { time: '3 hours ago', action: 'QEMU updated to v9.0.1', type: 'success' },
    { time: 'Yesterday', action: 'Diagnostics completed - no issues', type: 'success' },
  ]

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors">
          <div className={clsx('w-2 h-2 rounded-full mt-2 flex-shrink-0', {
            'bg-status-success': activity.type === 'success',
            'bg-status-info': activity.type === 'info',
            'bg-status-warning': activity.type === 'warning',
            'bg-status-error': activity.type === 'error',
          })} />
          <div className="flex-1 min-w-0">
            <p className="body-sm text-text-primary">{activity.action}</p>
            <p className="caption text-text-tertiary">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}