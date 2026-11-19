import { create } from 'zustand'
import { ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { clsx } from 'clsx'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    // Auto remove after duration
    const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 5000)
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, duration)

    return id
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },
}))

// Hook for easy toast usage
export function useToast() {
  const { addToast, removeToast, clearToasts } = useToastStore()

  const success = (title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'success', title, message, ...options })

  const error = (title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'error', title, message, ...options })

  const warning = (title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'warning', title, message, ...options })

  const info = (title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'info', title, message, ...options })

  return { success, error, warning, info, removeToast, clearToasts }
}

// Toast component
interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

function ToastComponent({ toast, onClose }: ToastProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const Icon = icons[toast.type]

  const baseClasses = 'flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border animate-slide-up'
  const typeClasses = {
    success: 'bg-status-success/10 border-status-success text-status-success',
    error: 'bg-status-error/10 border-status-error text-status-error',
    warning: 'bg-status-warning/10 border-status-warning text-status-warning',
    info: 'bg-status-info/10 border-status-info text-status-info',
  }

  return (
    <div className={clsx(baseClasses, typeClasses[toast.type])} role="alert">
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-text-secondary mt-0.5">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick()
              onClose(toast.id)
            }}
            className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700 underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// Toaster container
export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[800] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-96 max-w-[calc(100vw-2rem)]">
          <ToastComponent toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  )
}