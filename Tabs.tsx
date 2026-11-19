import React, { ReactNode, useState, createContext, useContext } from 'react'
import { clsx } from 'clsx'

interface TabsProps {
  children: ReactNode
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
}

const TabsContext = createContext<{
  activeValue: string
  onChange: (value: string) => void
} | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within Tabs')
  }
  return context
}

export function Tabs({ children, defaultValue, value, onChange, className }: TabsProps) {
  const [activeValue, setActiveValue] = useState(value || defaultValue || '')

  const contextValue = {
    activeValue: value || activeValue,
    onChange: (val: string) => {
      if (!value) setActiveValue(val)
      onChange?.(val)
    },
  }

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={clsx(className)}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={clsx(
        'flex gap-1 bg-surface-tertiary p-1 rounded-lg',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function TabsTrigger({ value, children, disabled = false, className }: TabsTriggerProps) {
  const { activeValue, onChange } = useTabsContext()
  const isActive = activeValue === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      onClick={() => !disabled && onChange(value)}
      disabled={disabled}
      className={clsx(
        'px-4 py-2 text-sm font-medium rounded-md transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
        isActive
          ? 'bg-surface-primary text-text-primary shadow-sm'
          : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeValue } = useTabsContext()
  const isActive = activeValue === value

  if (!isActive) return null

  return (
    <div
      role="tabpanel"
      className={clsx('animate-fade-in', className)}
    >
      {children}
    </div>
  )
}

// Need to import React
import React from 'react'