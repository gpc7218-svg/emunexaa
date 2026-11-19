import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import {
  PlusCircle,
  Search,
  Filter,
  MoreVertical,
  Play,
  Stop,
  RotateCcw,
  Pause,
  Copy,
  Trash2,
  Eye,
  Edit,
  ChevronDown,
  Smartphone,
  Cpu,
  MemoryStick,
  Database,
  AlertTriangle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useDeviceStore } from '@/hooks/useDeviceStore'
import { useToast } from '@/components/ui/Toaster'
import { formatBytes } from '@/utils/formatters'

export function DeviceManager() {
  const { t } = useTranslation()
  const { devices, deleteDevice, setDeviceStatus, getDevice, markDeviceUsed } = useDeviceStore()
  const { success, error } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [archFilter, setArchFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'updated' | 'created'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [deleteConfirm, setDeleteConfirm] = useState<{ device: typeof devices[0] | null; open: boolean }>({ device: null, open: false })

  // Filter and sort devices
  const filteredDevices = devices
    .filter((device) => {
      const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || device.status === statusFilter
      const matchesArch = archFilter === 'all' || device.architecture === archFilter
      return matchesSearch && matchesStatus && matchesArch
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'updated':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleStart = (device: typeof devices[0]) => {
    setDeviceStatus(device.id, 'starting')
    // In production, call backend to start VM
    setTimeout(() => {
      setDeviceStatus(device.id, 'running')
      markDeviceUsed(device.id)
      success(t('start'), `${device.name} ${t('started')}`)
    }, 1500)
  }

  const handleStop = (device: typeof devices[0]) => {
    setDeviceStatus(device.id, 'stopping')
    setTimeout(() => {
      setDeviceStatus(device.id, 'stopped')
      success(t('stop'), `${device.name} ${t('stopped')}`)
    }, 1000)
  }

  const handleRestart = (device: typeof devices[0]) => {
    setDeviceStatus(device.id, 'starting')
    setTimeout(() => {
      setDeviceStatus(device.id, 'running')
      markDeviceUsed(device.id)
      success(t('restart'), `${device.name} ${t('restarted')}`)
    }, 2000)
  }

  const handlePause = (device: typeof devices[0]) => {
    setDeviceStatus(device.id, 'paused')
    success(t('pause'), `${device.name} ${t('paused')}`)
  }

  const handleResume = (device: typeof devices[0]) => {
    setDeviceStatus(device.id, 'running')
    markDeviceUsed(device.id)
    success(t('resume'), `${device.name} ${t('resumed')}`)
  }

  const handleClone = (device: typeof devices[0]) => {
    const newName = `${device.name} (Copy)`
    const newId = useDeviceStore.getState().cloneDevice(device.id, newName)
    success(t('clone'), `${device.name} ${t('cloned')}`)
  }

  const handleDelete = (device: typeof devices[0]) => {
    setDeleteConfirm({ device, open: true })
  }

  const confirmDelete = () => {
    if (deleteConfirm.device) {
      deleteDevice(deleteConfirm.device.id)
      success(t('delete'), `${deleteConfirm.device.name} ${t('deleted')}`)
      setDeleteConfirm({ device: null, open: false })
    }
  }

  const statusIcons = {
    running: Play,
    stopped: Stop,
    paused: Pause,
    starting: RotateCcw,
    stopping: RotateCcw,
    error: AlertTriangle,
  }

  const statusColors = {
    running: 'success',
    stopped: 'neutral',
    paused: 'warning',
    starting: 'info',
    stopping: 'info',
    error: 'error',
  } as const

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-2">{t('deviceManager')}</h1>
          <p className="body text-text-tertiary mt-1">{devices.length} {t('devices')}</p>
        </div>
        <NavLink to="/devices/create" className="btn-primary">
          <PlusCircle className="w-4 h-4" />
          <span>{t('createDevice')}</span>
        </NavLink>
      </div>

      {/* Toolbar */}
      <Card className="card-hover">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <Input
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">{t('allStatuses') || 'All Statuses'}</option>
                <option value="running">{t('running')}</option>
                <option value="stopped">{t('stopped')}</option>
                <option value="paused">{t('paused')}</option>
                <option value="error">{t('error')}</option>
              </Select>
              <Select
                value={archFilter}
                onChange={(e) => setArchFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">{t('allArchitectures') || 'All Architectures'}</option>
                <option value="x86_64">x86_64</option>
                <option value="arm64">arm64</option>
              </Select>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-40"
              >
                <option value="updated">{t('sortByUpdated') || 'Recently Updated'}</option>
                <option value="name">{t('sortByName') || 'Name'}</option>
                <option value="status">{t('sortByStatus') || 'Status'}</option>
                <option value="created">{t('sortByCreated') || 'Created Date'}</option>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
              >
                <ChevronDown className={clsx('w-4 h-4', sortOrder === 'desc' && 'rotate-180')} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDevices.length === 0 ? (
          <div className="col-span-full empty-state">
            <Smartphone className="empty-state-icon" />
            <h3 className="empty-state-title">{devices.length === 0 ? t('noDevicesYet') : t('noDevicesFound')}</h3>
            <p className="empty-state-description">
              {devices.length === 0 ? t('createFirstDevice') : 'Try adjusting your filters'}
            </p>
            {devices.length === 0 && (
              <NavLink to="/devices/create" className="btn-primary mt-4">
                <PlusCircle className="w-4 h-4" />
                <span>{t('createFirstDevice')}</span>
              </NavLink>
            )}
          </div>
        ) : (
          filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onStart={() => handleStart(device)}
              onStop={() => handleStop(device)}
              onRestart={() => handleRestart(device)}
              onPause={() => handlePause(device)}
              onResume={() => handleResume(device)}
              onClone={() => handleClone(device)}
              onDelete={() => handleDelete(device)}
              onView={() => markDeviceUsed(device.id)}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ device: null, open: false })}
        onConfirm={confirmDelete}
        title={t('confirmDelete')}
        message={t('deleteWarning')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        variant="danger"
      />
    </div>
  )
}

// Device Card Component
interface DeviceCardProps {
  device: {
    id: string
    name: string
    status: string
    architecture: string
    cpu: { cores: number; threads: number }
    memory: { sizeMB: number }
    storage: { sizeBytes: number }
    image: { path: string; format: string; architecture: string }
    lastUsedAt?: Date
    updatedAt: Date
  }
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onPause: () => void
  onResume: () => void
  onClone: () => void
  onDelete: () => void
  onView: () => void
}

function DeviceCard({
  device,
  onStart,
  onStop,
  onRestart,
  onPause,
  onResume,
  onClone,
  onDelete,
  onView,
}: DeviceCardProps) {
  const { t } = useTranslation()

  const statusIcons = {
    running: Play,
    stopped: Stop,
    paused: Pause,
    starting: RotateCcw,
    stopping: RotateCcw,
    error: AlertTriangle,
  }

  const statusColors = {
    running: 'success',
    stopped: 'neutral',
    paused: 'warning',
    starting: 'info',
    stopping: 'info',
    error: 'error',
  } as const

  const StatusIcon = statusIcons[device.status as keyof typeof statusIcons] || Stop
  const statusVariant = statusColors[device.status as keyof typeof statusColors] || 'neutral'

  const isRunning = device.status === 'running'
  const isStopped = device.status === 'stopped'
  const isPaused = device.status === 'paused'

  return (
    <Card className="card-interactive group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-text-primary truncate">{device.name}</h3>
                <Badge variant={statusVariant} dot>
                  <StatusIcon className="w-3 h-3" />
                  {t(device.status)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-3 text-text-tertiary">
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
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  {device.architecture}
                </span>
              </div>

              <div className="flex items-center gap-3 text-text-tertiary">
                <span className="caption">
                  {device.lastUsedAt
                    ? `${t('lastUsed') || 'Last used'} ${formatRelativeTime(device.lastUsedAt)}`
                    : t('neverUsed') || 'Never used'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-primary">
          {isStopped && (
            <Button size="sm" variant="primary" onClick={onStart} className="flex-1 sm:flex-none">
              <Play className="w-3.5 h-3.5" />
              <span>{t('start')}</span>
            </Button>
          )}
          {isRunning && (
            <>
              <Button size="sm" variant="secondary" onClick={onPause} className="flex-1 sm:flex-none">
                <Pause className="w-3.5 h-3.5" />
                <span>{t('pause')}</span>
              </Button>
              <Button size="sm" variant="secondary" onClick={onStop} className="flex-1 sm:flex-none">
                <Stop className="w-3.5 h-3.5" />
                <span>{t('stop')}</span>
              </Button>
            </>
          )}
          {isPaused && (
            <Button size="sm" variant="primary" onClick={onResume} className="flex-1 sm:flex-none">
              <Play className="w-3.5 h-3.5" />
              <span>{t('resume')}</span>
            </Button>
          )}
          {isRunning && (
            <Button size="sm" variant="secondary" onClick={onRestart} className="flex-1 sm:flex-none">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('restart')}</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="flex-1 sm:flex-none">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView} className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {t('details')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClone} className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                {t('clone')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="flex items-center gap-2 text-status-error">
                <Trash2 className="w-4 h-4" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function (imported from formatters but defined here for standalone)
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return 'just now'
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`
  if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`
  return date.toLocaleDateString()
}