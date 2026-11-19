import { create } from 'zustand'

export interface ImageInspectionResult {
  path: string
  format: string
  architecture: string
  sizeBytes: number
  partitions: Array<{
    name: string
    type: string
    sizeBytes: number
  }>
  hasBootloader: boolean
  hasKernel: boolean
  hasInitramfs: boolean
  hasSystemPartition: boolean
  hasVendorPartition: boolean
  hasSuperPartition: boolean
  compatibility: 'full' | 'config' | 'experimental' | 'incompatible'
  compatibilityNotes: string[]
  androidVersion?: string
  androidApiLevel?: number
  inspectedAt: Date
}

interface ImageState {
  images: Map<string, ImageInspectionResult>
  inspecting: boolean

  // Actions
  inspectImage: (path: string) => Promise<ImageInspectionResult>
  getInspection: (path: string) => ImageInspectionResult | undefined
  clearCache: () => void
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: new Map(),
  inspecting: false,

  inspectImage: async (path: string) => {
    // Check cache first
    const cached = get().images.get(path)
    if (cached) return cached

    set({ inspecting: true })

    try {
      // In production, this would call the Go backend via Wails
      // For now, simulate inspection with mock data based on file extension
      await new Promise(resolve => setTimeout(resolve, 1500))

      const ext = path.split('.').pop()?.toLowerCase() || ''
      const fileName = path.split(/[/\\]/).pop() || ''

      // Generate mock inspection result
      const result: ImageInspectionResult = {
        path,
        format: ext === 'qcow2' ? 'qcow2' : ext === 'iso' ? 'iso' : 'raw',
        architecture: fileName.includes('arm64') || fileName.includes('aarch64') ? 'arm64' : 'x86_64',
        sizeBytes: 2 * 1024 * 1024 * 1024, // 2GB mock
        partitions: [
          { name: 'boot', type: 'boot', sizeBytes: 64 * 1024 * 1024 },
          { name: 'system', type: 'system', sizeBytes: 1.5 * 1024 * 1024 * 1024 },
          { name: 'vendor', type: 'vendor', sizeBytes: 256 * 1024 * 1024 },
        ],
        hasBootloader: true,
        hasKernel: true,
        hasInitramfs: true,
        hasSystemPartition: true,
        hasVendorPartition: true,
        hasSuperPartition: false,
        compatibility: ext === 'iso' ? 'config' : 'full',
        compatibilityNotes: ext === 'iso'
          ? ['ISO image - may be Android-x86 installer; requires installation to disk first']
          : ['Complete bootable system detected with kernel, initramfs, bootloader, and system partition'],
        androidVersion: '14',
        androidApiLevel: 34,
        inspectedAt: new Date(),
      }

      set((state) => {
        const newImages = new Map(state.images)
        newImages.set(path, result)
        return { images: newImages, inspecting: false }
      })

      return result
    } catch (error) {
      set({ inspecting: false })
      throw error
    }
  },

  getInspection: (path: string) => {
    return get().images.get(path)
  },

  clearCache: () => {
    set({ images: new Map() })
  },
}))