import { create } from 'zustand'

export interface SystemStats {
  cpuUsage: number
  memoryUsage: number
  storageUsage: number
  totalMemoryGB: number
  usedMemoryGB: number
  totalStorageGB: number
  usedStorageGB: number
}

export interface VirtualizationStatus {
  available: boolean
  engine: string
  acceleration: string
  recommended: string
  whpxSupported: boolean
  tcgSupported: boolean
  conflicts: string[]
}

interface SystemState {
  systemStats: SystemStats
  virtualizationStatus: VirtualizationStatus
  isLoading: boolean
  error: string | null

  // Actions
  fetchSystemStats: () => Promise<void>
  fetchVirtualizationStatus: () => Promise<void>
  runDiagnostics: () => Promise<void>
  refreshAll: () => Promise<void>
}

export const useSystemStore = create<SystemState>((set, get) => ({
  systemStats: {
    cpuUsage: 0,
    memoryUsage: 0,
    storageUsage: 0,
    totalMemoryGB: 0,
    usedMemoryGB: 0,
    totalStorageGB: 0,
    usedStorageGB: 0,
  },

  virtualizationStatus: {
    available: false,
    engine: 'Unknown',
    acceleration: 'Unknown',
    recommended: 'Unknown',
    whpxSupported: false,
    tcgSupported: false,
    conflicts: [],
  },

  isLoading: false,
  error: null,

  fetchSystemStats: async () => {
    set({ isLoading: true })
    try {
      // In production, this would call the Go backend via Wails
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 500))

      // Generate realistic mock data
      const cpuUsage = Math.floor(Math.random() * 40) + 10 // 10-50%
      const memoryUsage = Math.floor(Math.random() * 50) + 20 // 20-70%
      const storageUsage = Math.floor(Math.random() * 60) + 10 // 10-70%

      set({
        systemStats: {
          cpuUsage,
          memoryUsage,
          storageUsage,
          totalMemoryGB: 16,
          usedMemoryGB: Math.round(16 * memoryUsage / 100 * 10) / 10,
          totalStorageGB: 512,
          usedStorageGB: Math.round(512 * storageUsage / 100 * 10) / 10,
        },
        isLoading: false,
      })
    } catch (error) {
      set({ error: 'Failed to fetch system stats', isLoading: false })
    }
  },

  fetchVirtualizationStatus: async () => {
    try {
      // In production, this would call the Go backend
      await new Promise(resolve => setTimeout(resolve, 300))

      // Mock data - in reality this comes from hardware detection
      const whpxSupported = true // Would be detected from hardware
      const tcgSupported = true

      set({
        virtualizationStatus: {
          available: whpxSupported,
          engine: 'QEMU 9.0.1',
          acceleration: whpxSupported ? 'WHPX' : 'TCG',
          recommended: whpxSupported ? 'WHPX' : 'TCG',
          whpxSupported,
          tcgSupported,
          conflicts: whpxSupported ? [] : ['WHPX not available - using TCG emulation'],
        },
      })
    } catch (error) {
      set({
        virtualizationStatus: {
          available: false,
          engine: 'Unknown',
          acceleration: 'Unknown',
          recommended: 'Unknown',
          whpxSupported: false,
          tcgSupported: true,
          conflicts: ['Failed to detect virtualization capabilities'],
        },
      })
    }
  },

  runDiagnostics: async () => {
    set({ isLoading: true, error: null })
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Refresh both stats and virtualization status
      await get().fetchSystemStats()
      await get().fetchVirtualizationStatus()

      set({ isLoading: false })
    } catch (error) {
      set({ error: 'Diagnostics failed', isLoading: false })
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchSystemStats(),
      get().fetchVirtualizationStatus(),
    ])
  },
}))