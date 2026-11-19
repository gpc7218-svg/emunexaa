import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  FileText,
  Search,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HardDrive,
  Download,
  ExternalLink,
  RotateCcw,
  Trash2,
  Eye,
  Plus,
  Filter,
  ChevronDown,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { useImageStore } from '@/hooks/useImageStore'
import { useToast } from '@/components/ui/Toaster'
import { formatBytes } from '@/utils/formatters'

interface ImportedImage {
  id: string
  name: string
  path: string
  format: string
  sizeBytes: number
  architecture: string
  compatibility: 'full' | 'config' | 'experimental' | 'incompatible'
  importedAt: Date
  inspected: boolean
}

const mockImages: ImportedImage[] = [
  {
    id: '1',
    name: 'lineage-21.0-x86_64.img',
    path: '~/EmuNexa/images/lineage-21.0-x86_64.img',
    format: 'qcow2',
    sizeBytes: 2 * 1024 * 1024 * 1024,
    architecture: 'x86_64',
    compatibility: 'full',
    importedAt: new Date('2025-01-15'),
    inspected: true,
  },
  {
    id: '2',
    name: 'android-x86_64-13.0-r2.iso',
    path: '~/EmuNexa/images/android-x86_64-13.0-r2.iso',
    format: 'iso',
    sizeBytes: 800 * 1024 * 1024,
    architecture: 'x86_64',
    compatibility: 'config',
    importedAt: new Date('2025-01-18'),
    inspected: true,
  },
]

export function ImportImage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { inspectImage } = useImageStore()
  const { success, error, warning } = useToast()
  const [images, setImages] = useState<ImportedImage[]>(mockImages)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [filterCompat, setFilterCompat] = useState<string>('all')
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null)

  const filteredImages = filterCompat === 'all'
    ? images
    : images.filter(img => img.compatibility === filterCompat)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return ['img', 'iso', 'qcow2', 'raw', 'zip', 'gz', 'xz'].includes(ext || '')
    })

    if (validFiles.length !== files.length) {
      warning(t('invalidFiles'), t('someFilesSkipped'))
    }

    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [warning])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return ['img', 'iso', 'qcow2', 'raw', 'zip', 'gz', 'xz'].includes(ext || '')
    })

    if (validFiles.length !== files.length) {
      warning(t('invalidFiles'), t('someFilesSkipped'))
    }

    setSelectedFiles(prev => [...prev, ...validFiles])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleImport = async () => {
    if (selectedFiles.length === 0) return

    setImporting(true)
    try {
      for (const file of selectedFiles) {
        // Simulate import progress
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Inspect the image
        const inspection = await inspectImage(file.name)

        const newImage: ImportedImage = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: file.name,
          path: file.path || `~/EmuNexa/images/${file.name}`,
          format: inspection.format,
          sizeBytes: file.size,
          architecture: inspection.architecture,
          compatibility: inspection.compatibility,
          importedAt: new Date(),
          inspected: true,
        }

        setImages(prev => [newImage, ...prev])
        success(t('imported'), `${file.name} ${t('importedSuccessfully')}`)
      }
      setSelectedFiles([])
    } catch (err) {
      error(t('error'), t('importFailed'))
    } finally {
      setImporting(false)
    }
  }

  const handleReinspect = async (image: ImportedImage) => {
    try {
      await inspectImage(image.path)
      success(t('reinspected'), `${image.name} ${t('reinspectedSuccessfully')}`)
    } catch (err) {
      error(t('error'), t('reinspectFailed'))
    }
  }

  const handleDelete = (image: ImportedImage) => {
    if (confirm(t('confirmDeleteImage') + ` "${image.name}"?`)) {
      setImages(prev => prev.filter(i => i.id !== image.id))
      success(t('deleted'), `${image.name} ${t('deletedSuccessfully')}`)
    }
  }

  const compatibilityLabels = {
    full: { label: t('compatible'), variant: 'success' as const },
    config: { label: t('needsConfig'), variant: 'warning' as const },
    experimental: { label: t('experimental'), variant: 'info' as const },
    incompatible: { label: t('incompatible'), variant: 'error' as const },
  }

  const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    qcow2: HardDrive,
    iso: FileText,
    raw: HardDrive,
    img: HardDrive,
    zip: FileText,
    gz: FileText,
    xz: FileText,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-2">{t('importImage')}</h1>
          <p className="body text-text-tertiary mt-1">{t('importImageSubtitle')}</p>
        </div>
        <Button variant="primary" onClick={() => document.getElementById('file-input')?.click()}>
          <Plus className="w-4 h-4" />
          <span>{t('addImages')}</span>
        </Button>
      </div>

      {/* Drop Zone */}
      <Card className={clsx('card-hover relative overflow-hidden', dragActive && 'border-brand-500 bg-brand-500/5')}>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".img,.iso,.qcow2,.raw,.zip,.gz,.xz"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div
          className="p-12 text-center"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-16 h-16 mx-auto text-text-tertiary mb-4" />
          <h3 className="heading-4 mb-2">{t('dragDropImages')}</h3>
          <p className="text-text-secondary mb-4">{t('dragDropHint')}</p>
          <Button variant="secondary" onClick={() => document.getElementById('file-input')?.click()}>
            <Upload className="w-4 h-4" />
            <span>{t('browseFiles')}</span>
          </Button>
          <p className="caption text-text-tertiary mt-4">
            {t('supportedFormats')}: RAW, QCOW2, ISO, IMG, ZIP, GZIP, XZ
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="border-t border-border-primary p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-text-primary">
                {selectedFiles.length} {t('filesSelected')}
              </h4>
              <Button variant="primary" onClick={handleImport} loading={importing}>
                <Download className="w-4 h-4" />
                <span>{importing ? t('importing') : t('importSelected')}</span>
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-surface-secondary rounded-lg">
                  <FileText className="w-5 h-5 text-text-tertiary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{file.name}</p>
                    <p className="caption text-text-tertiary">{formatBytes(file.size)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Imported Images */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="heading-3">{t('importedImages')} ({images.length})</h2>
          <div className="flex gap-2">
            <Select
              value={filterCompat}
              onChange={(e) => setFilterCompat(e.target.value)}
              className="w-48"
            >
              <option value="all">{t('all')}</option>
              <option value="full">{t('compatible')}</option>
              <option value="config">{t('needsConfig')}</option>
              <option value="experimental">{t('experimental')}</option>
              <option value="incompatible">{t('incompatible')}</option>
            </Select>
          </div>
        </div>

        {filteredImages.length === 0 ? (
          <Card className="card-hover">
            <CardContent className="p-12 text-center">
              <HardDrive className="w-16 h-16 mx-auto text-text-tertiary mb-4" />
              <h3 className="heading-4 mb-2">{images.length === 0 ? t('noImagesImported') : t('noImagesMatchFilter')}</h3>
              <p className="text-text-secondary mb-4">
                {images.length === 0
                  ? t('noImagesImportedDesc')
                  : t('noImagesMatchFilterDesc')}
              </p>
              {images.length === 0 && (
                <Button variant="primary" onClick={() => document.getElementById('file-input')?.click()}>
                  <Plus className="w-4 h-4" />
                  <span>{t('importFirstImage')}</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredImages.map(image => (
              <ImageCard
                key={image.id}
                image={image}
                onInspect={() => handleReinspect(image)}
                onDelete={() => handleDelete(image)}
                onUse={() => navigate('/devices/create')}
                expanded={expandedDetails === image.id}
                onToggleExpand={() => setExpandedDetails(expandedDetails === image.id ? null : image.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-brand-600" />
            {t('importHelp')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-text-primary mb-3">{t('recommendedSources')}</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />
                  <span>{t('jqssunLineageOS')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />
                  <span>{t('androidX86')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />
                  <span>{t('prebuiltQEMUImages')}</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-text-primary mb-3">{t('importantNotes')}</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
                  <span>{t('gsiNote')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
                  <span>{t('kernelRequired')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
                  <span>{t('arm64Slow')}</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Image Card Component
function ImageCard({
  image,
  onInspect,
  onDelete,
  onUse,
  expanded,
  onToggleExpand,
}: {
  image: ImportedImage
  onInspect: () => void
  onDelete: () => void
  onUse: () => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  const { t } = useTranslation()

  const FormatIcon = {
    qcow2: HardDrive,
    iso: FileText,
    raw: HardDrive,
    img: HardDrive,
    zip: FileText,
    gz: FileText,
    xz: FileText,
  }[image.format] || FileText

  const compatInfo = {
    full: { label: t('compatible'), variant: 'success' as const },
    config: { label: t('needsConfig'), variant: 'warning' as const },
    experimental: { label: t('experimental'), variant: 'info' as const },
    incompatible: { label: t('incompatible'), variant: 'error' as const },
  }[image.compatibility]

  return (
    <Card className="card-interactive">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
            <FormatIcon className="w-7 h-7 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-text-primary truncate">{image.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={compatInfo.variant} dot>
                    {compatInfo.label}
                  </Badge>
                  <span className="text-xs text-text-tertiary font-mono">{image.format.toUpperCase()}</span>
                  <span className="text-xs text-text-tertiary">{image.architecture}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onUse}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createDevice')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleExpand}>
                    <Eye className="w-4 h-4 mr-2" />
                    {expanded ? t('collapse') : t('expand')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onInspect}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('reinspect')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-status-error">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-4 mt-2 text-sm text-text-tertiary">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5" />
                {formatBytes(image.sizeBytes)}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5">📅</span>
                {formatRelativeTime(image.importedAt)}
              </span>
            </div>

            {expanded && (
              <div className="mt-4 pt-4 border-t border-border-primary animate-slide-down">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-text-tertiary">{t('format')}</p>
                    <p className="font-medium text-text-primary capitalize">{image.format}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">{t('architecture')}</p>
                    <p className="font-medium text-text-primary">{image.architecture}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">{t('size')}</p>
                    <p className="font-medium text-text-primary">{formatBytes(image.sizeBytes)}</p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">{t('compatibility')}</p>
                    <p className="font-medium text-text-primary">{compatInfo.label}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="primary" size="sm" onClick={onUse}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('createDevice')}</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onInspect}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('reinspect')}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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