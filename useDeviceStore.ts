import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface Device {
  id: string
  name: string
  status: 'stopped' | 'starting' | 'running' | 'paused' | 'stopping' | 'error'
  createdAt: Date
  updatedAt: Date
  lastUsedAt?: Date
  architecture: string
  cpu: { cores: number; threads: number }
  memory: { sizeMB: number }
  storage: { sizeBytes: number }
  image: {
    path: string
    format: string
    architecture: string
  }
}

interface DeviceState {
  devices: Device[]
  selectedDeviceId: string | null

  // Actions
  addDevice: (device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateDevice: (id: string, updates: Partial<Device>) => void
  deleteDevice: (id: string) => void
  cloneDevice: (id: string, newName: string) => string
  selectDevice: (id: string | null) => void
  setDeviceStatus: (id: string, status: Device['status']) => void
  markDeviceUsed: (id: string) => void
  getDevice: (id: string) => Device | undefined
  getRecentDevices: (limit: number) => Device[]
  getRunningDevices: () => Device[]
  importDevice: (device: Device) => void
}

// Mock data for demonstration
const mockDevices: Device[] = [
  {
    id: '1',
    name: 'Pixel 8 Pro',
    status: 'running',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-20'),
    lastUsedAt: new Date('2025-01-20'),
    architecture: 'x86_64',
    cpu: { cores: 4, threads: 1 },
    memory: { sizeMB: 4096 },
    storage: { sizeBytes: 8 * 1024 * 1024 * 1024 },
    image: {
      path: '~/EmuNexa/images/lineage-21.0-x86_64.img',
      format: 'qcow2',
      architecture: 'x86_64',
    },
  },
  {
    id: '2',
    name: 'Test Device',
    status: 'stopped',
    createdAt: new Date('2025-01-18'),
    updatedAt: new Date('2025-01-18'),
    lastUsedAt: new Date('2025-01-19'),
    architecture: 'x86_64',
    cpu: { cores: 2, threads: 1 },
    memory: { sizeMB: 2048 },
    storage: { sizeBytes: 4 * 1024 * 1024 * 1024 },
    image: {
      path: '~/EmuNexa/images/android-x86_64.img',
      format: 'raw',
      architecture: 'x86_64',
    },
  },
]

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      devices: mockDevices,
      selectedDeviceId: null,

      addDevice: (device) => {
        const id = uuidv4()
        const now = new Date()
        const newDevice: Device = {
          ...device,
          id,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ devices: [...state.devices, newDevice] }))
        return id
      },

      updateDevice: (id, updates) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: new Date() } : d
          ),
        }))
      },

      deleteDevice: (id) => {
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id),
          selectedDeviceId: state.selectedDeviceId === id ? null : state.selectedDeviceId,
        }))
      },

      cloneDevice: (id, newName) => {
        const device = get().devices.find((d) => d.id === id)
        if (!device) throw new Error('Device not found')
        const newId = uuidv4()
        const now = new Date()
        const cloned: Device = {
          ...device,
          id: newId,
          name: newName,
          createdAt: now,
          updatedAt: now,
          lastUsedAt: undefined,
          status: 'stopped',
        }
        set((state) => ({ devices: [...state.devices, cloned] }))
        return newId
      },

      selectDevice: (id) => {
        set({ selectedDeviceId: id })
      },

      setDeviceStatus: (id, status) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, status, updatedAt: new Date() } : d
          ),
        }))
      },

      markDeviceUsed: (id) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, lastUsedAt: new Date(), updatedAt: new Date() } : d
          ),
        }))
      },

      getDevice: (id) => {
        return get().devices.find((d) => d.id === id)
      },

      getRecentDevices: (limit) => {
        return [...get().devices]
          .sort((a, b) => {
            if (!a.lastUsedAt && !b.lastUsedAt) return 0
            if (!a.lastUsedAt) return 1
            if (!b.lastUsedAt) return -1
            return b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
          })
          .slice(0, limit)
      },

      getRunningDevices: () => {
        return get().devices.filter((d) => d.status === 'running')
      },

      importDevice: (device) => {
        set((state) => ({ devices: [...state.devices, device] }))
      },
    }),
    {
      name: 'emunexa-devices',
      partialize: (state) => ({ devices: state.devices, selectedDeviceId: state.selectedDeviceId }),
    }
  )
)