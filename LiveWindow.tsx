import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Maximize,
  Minimize,
  RotateCcw,
  Camera,
  MousePointer,
  Keyboard,
  Copy,
  Clipboard,
  Volume2,
  VolumeX,
  Power,
  Zap,
  RefreshCw,
  AlertTriangle,
  X,
  ChevronDown,
  Wifi,
  WifiOff,
  Send,
  Monitor,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { useDeviceStore } from '@/hooks/useDeviceStore'
import { useToast } from '@/components/ui/Toaster'

export function LiveWindow() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { devices, getDevice, setDeviceStatus } = useDeviceStore()
  const { success, error, warning } = useToast()

  const device = getDevice(id || '')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMouseCaptured, setIsMouseCaptured] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [displayError, setDisplayError] = useState<string | null>(null)
  const [stats, setStats] = useState({ cpu: 0, memory: 0, network: { rx: 0, tx: 0 } })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeout = useRef<NodeJS.Timeout>()

  // Simulate connection
  useEffect(() => {
    if (!device) {
      navigate('/devices')
      return
    }

    const timer = setTimeout(() => {
      setConnectionStatus('connected')
      // Simulate stats updates
      const statsInterval = setInterval(() => {
        setStats(prev => ({
          cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.min(100, Math.max(0, prev.memory + (Math.random() - 0.5) * 5)),
          network: {
            rx: prev.network.rx + Math.random() * 1000,
            tx: prev.network.tx + Math.random() * 500,
          },
        }))
      }, 2000)

      return () => clearInterval(statsInterval)
    }, 1000)

    return () => clearTimeout(timer)
  }, [device, navigate])

  // Handle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      error(t('error'), t('fullscreenError') || 'Failed to toggle fullscreen')
    }
  }, [isFullscreen, error])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
      }
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen()
      }
      // Ctrl+Alt to release mouse capture
      if (e.ctrlKey && e.altKey) {
        setIsMouseCaptured(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, toggleFullscreen])

  // Auto-hide controls
  useEffect(() => {
    if (isFullscreen && showControls) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    return () => {
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current)
    }
  }, [isFullscreen, showControls])

  const handleMouseMove = () => {
    if (isFullscreen && !showControls) {
      setShowControls(true)
    }
  }

  const handleCanvasClick = () => {
    setIsMouseCaptured(true)
    if (canvasRef.current) {
      canvasRef.current.requestPointerLock()
    }
  }

  const handlePointerLockChange = () => {
    setIsMouseCaptured(document.pointerLockElement === canvasRef.current)
  }

  useEffect(() => {
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange)
  }, [])

  const takeScreenshot = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = `emunexa-${device?.name}-${Date.now()}.png`
      link.href = canvasRef.current.toDataURL('image/png')
      link.click()
      success(t('screenshot'), t('screenshotSaved') || 'Screenshot saved')
    }
  }

  const sendCtrlAltDel = () => {
    // Send Ctrl+Alt+Del to guest
    warning(t('ctrlAltDel'), t('ctrlAltDelSent') || 'Ctrl+Alt+Del sent to guest')
  }

  const rotateDisplay = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const resetScale = () => {
    setScale(1)
  }

  const fitToWindow = () => {
    if (containerRef.current && canvasRef.current) {
      const container = containerRef.current.getBoundingClientRect()
      const canvas = canvasRef.current
      const scaleX = container.width / canvas.width
      const scaleY = container.height / canvas.height
      setScale(Math.min(scaleX, scaleY) * 0.95)
    }
  }

  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-status-warning mx-auto mb-4" />
          <h2 className="heading-3">{t('deviceNotFound')}</h2>
          <Button onClick={() => navigate('/devices')} className="mt-4">
            {t('backToDevices')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Top Bar */}
      <div className={clsx(
        'fixed top-0 left-0 right-0 z-40 bg-surface-primary/95 backdrop-blur-sm border-b border-border-primary transition-all duration-300',
        isFullscreen && !showControls && 'translate-y-[-100%]'
      )}>
        <div className="max-w-full mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/devices')}>
              <Monitor className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-text-primary truncate max-w-xs">{device.name}</h1>
              <div className="flex items-center gap-2 text-xs">
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  connectionStatus === 'connected' && 'bg-status-success/10 text-status-success',
                  connectionStatus === 'connecting' && 'bg-status-info/10 text-status-info',
                  connectionStatus === 'disconnected' && 'bg-status-warning/10 text-status-warning',
                  connectionStatus === 'error' && 'bg-status-error/10 text-status-error',
                )}>
                  {t(connectionStatus)}
                </span>
                {device.status === 'running' && (
                  <span className="flex items-center gap-1 text-text-tertiary">
                    <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                    {t('running')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm text-text-tertiary">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {stats.cpu.toFixed(0)}% CPU
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5">💾</span>
                {stats.memory.toFixed(0)}% RAM
              </span>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={rotateDisplay} title={t('rotate')}>
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={takeScreenshot} title={t('screenshot')}>
                <Camera className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? t('windowed') : t('fullscreen')}>
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Display Area */}
      <div
        ref={containerRef}
        className={clsx(
          'relative w-full h-screen flex items-center justify-center',
          isFullscreen ? 'fixed inset-0' : 'pt-12'
        )}
        onMouseMove={handleMouseMove}
      >
        {/* Canvas / Display */}
        <div
          className={clsx(
            'relative bg-black',
            isMouseCaptured && 'cursor-none'
          )}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
          onClick={handleCanvasClick}
        >
          <canvas
            ref={canvasRef}
            width={device.display?.width || 1280}
            height={device.display?.height || 720}
            className="block"
            style={{ display: 'block' }}
          />

          {/* Placeholder content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-tertiary p-8">
            <Monitor className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="heading-4 mb-2">{t('displayPlaceholder') || 'Display Output'}</h3>
            <p className="text-center max-w-md">
              {connectionStatus === 'connecting' && t('connectingToDisplay') || 'Connecting to display...'}
              {connectionStatus === 'connected' && t('displayConnected') || 'Display connected - QEMU output would appear here'}
              {connectionStatus === 'error' && t('displayError') || 'Display connection error'}
            </p>
            {displayError && (
              <div className="mt-4 p-4 bg-status-error/10 border border-status-error/20 rounded-lg text-status-error text-sm max-w-md">
                {displayError}
              </div>
            )}
          </div>
        </div>

        {/* Connection error overlay */}
        {connectionStatus === 'error' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
            <div className="text-center p-8">
              <AlertTriangle className="w-16 h-16 text-status-error mx-auto mb-4" />
              <h3 className="heading-3 mb-2">{t('displayError')}</h3>
              <p className="text-text-secondary mb-4 max-w-md">{displayError || t('failedToConnect')}</p>
              <Button variant="primary" onClick={() => setConnectionStatus('connecting')}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('retry')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className={clsx(
        'fixed bottom-0 left-0 right-0 z-40 bg-surface-primary/95 backdrop-blur-sm border-t border-border-primary transition-all duration-300',
        isFullscreen && !showControls && 'translate-y-full'
      )}>
        <div className="max-w-full mx-auto px-4 py-3 flex flex-wrap items-center justify-center gap-2">
          {/* Mouse/Keyboard Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={isMouseCaptured ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setIsMouseCaptured(!isMouseCaptured)}
              className="gap-1"
            >
              <MousePointer className="w-4 h-4" />
              <span>{isMouseCaptured ? t('releaseMouse') : t('captureMouse')}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={sendCtrlAltDel} title={t('ctrlAltDel')}>
              <Keyboard className="w-5 h-5" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border-primary mx-2" />

          {/* Display Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setScale(Math.max(0.25, scale - 0.25))} title={t('zoomOut')}>
              <span className="text-lg">−</span>
            </Button>
            <span className="px-2 text-sm font-mono text-text-secondary w-16 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setScale(Math.min(3, scale + 0.25))} title={t('zoomIn')}>
              <span className="text-lg">+</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={resetScale} title={t('actualSize')}>
              {t('actualSize') || '100%'}
            </Button>
            <Button variant="ghost" size="sm" onClick={fitToWindow} title={t('fitToWindow')}>
              {t('fitToWindow') || 'Fit'}
            </Button>
          </div>

          <div className="w-px h-6 bg-border-primary mx-2" />

          {/* VM Controls */}
          <div className="flex items-center gap-2">
            {device.status === 'running' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setDeviceStatus(device.id, 'paused')}>
                  <Pause className="w-4 h-4 mr-1" />
                  {t('pause')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDeviceStatus(device.id, 'stopping')}>
                  <Power className="w-4 h-4 mr-1" />
                  {t('stop')}
                </Button>
              </>
            )}
            {device.status === 'paused' && (
              <Button variant="primary" size="sm" onClick={() => setDeviceStatus(device.id, 'running')}>
                <Zap className="w-4 h-4 mr-1" />
                {t('resume')}
              </Button>
            )}
            {device.status === 'stopped' && (
              <Button variant="primary" size="sm" onClick={() => setDeviceStatus(device.id, 'starting')}>
                <Zap className="w-4 h-4 mr-1" />
                {t('start')}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setDeviceStatus(device.id, 'starting')}>
              <RefreshCw className="w-4 h-4 mr-1" />
              {t('restart')}
            </Button>
          </div>

          {/* Send Keys Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Send className="w-4 h-4" />
                <span>{t('sendKeys')}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={sendCtrlAltDel}>
                <Keyboard className="w-4 h-4 mr-2" />
                Ctrl+Alt+Del
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Keyboard className="w-4 h-4 mr-2" />
                Ctrl+Esc
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Keyboard className="w-4 h-4 mr-2" />
                Alt+Tab
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Keyboard className="w-4 h-4 mr-2" />
                Win+D
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sidebar with additional controls (desktop only) */}
      {!isFullscreen && (
        <aside className="fixed right-0 top-12 bottom-16 w-64 bg-surface-primary border-l border-border-primary z-30 hidden lg:block">
          <div className="p-4 space-y-6 overflow-y-auto h-full">
            {/* Device Info */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-text-primary mb-3">{t('deviceInfo')}</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">{t('architecture')}</dt>
                    <dd className="font-medium text-text-primary">{device.architecture}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">{t('cpuCores')}</dt>
                    <dd className="font-medium text-text-primary">{device.cpu.cores} cores</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">{t('memory')}</dt>
                    <dd className="font-medium text-text-primary">{device.memory.sizeMB} MB</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">{t('storage')}</dt>
                    <dd className="font-medium text-text-primary">{formatBytes(device.storage.sizeBytes)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-text-primary mb-3">{t('quickActions')}</h4>
                <div className="space-y-2">
                  <Button variant="secondary" className="w-full justify-start gap-2" onClick={takeScreenshot}>
                    <Camera className="w-4 h-4" />
                    {t('screenshot')}
                  </Button>
                  <Button variant="secondary" className="w-full justify-start gap-2" onClick={rotateDisplay}>
                    <RotateCcw className="w-4 h-4" />
                    {t('rotateDisplay') || 'Rotate Display'}
                  </Button>
                  <Button variant="secondary" className="w-full justify-start gap-2" onClick={sendCtrlAltDel}>
                    <Keyboard className="w-4 h-4" />
                    {t('ctrlAltDel')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Stats */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-text-primary mb-3">{t('liveStats')}</h4>
                <div className="space-y-3">
                  <StatBar label={t('cpu')} value={stats.cpu} max={100} color="brand" />
                  <StatBar label={t('memory')} value={stats.memory} max={100} color="blue" />
                  <StatBar label={t('networkRx') || 'Network ↓'} value={stats.network.rx / 1024} max={1000} color="green" unit="KB/s" />
                  <StatBar label={t('networkTx') || 'Network ↑'} value={stats.network.tx / 1024} max={1000} color="orange" unit="KB/s" />
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      )}
    </div>
  )
}

// Stat Bar Component
function StatBar({ label, value, max, color, unit = '%' }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const percentage = Math.min(100, (value / max) * 100)

  const colors: Record<string, string> = {
    brand: 'bg-brand-600',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  }

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-tertiary">{label}</span>
        <span className="font-medium text-text-primary">{value.toFixed(unit === '%' ? 0 : 1)}{unit}</span>
      </div>
      <div className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-300', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}