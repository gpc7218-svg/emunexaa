import { ReactNode, useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

interface CollapsibleProps {
  open?: boolean
  defaultOpen?: boolean
  onChange?: (open: boolean) => void
  children: ReactNode
  className?: string
}

export function Collapsible({ open: controlledOpen, defaultOpen = false, onChange, children, className }: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(value)
    }
    onChange?.(value)
  }

  const toggle = () => setOpen(!open)

  return (
    <div className={clsx(className)}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child

        return React.cloneElement(child, {
          open,
          onToggle: toggle,
        } as any)
      })}
    </div>
  )
}

interface CollapsibleTriggerProps {
  children: ReactNode
  open?: boolean
  onToggle?: () => void
  className?: string
  asChild?: boolean
}

export function CollapsibleTrigger({ children, onToggle, className, asChild = false }: CollapsibleTriggerProps) {
  const trigger = (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'w-full flex items-center justify-between px-4 py-3 text-left',
        'hover:bg-surface-hover transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
        className
      )}
      aria-expanded={false}
    >
      {children}
    </button>
  )

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: onToggle,
      'aria-expanded': false,
    })
  }

  return trigger
}

interface CollapsibleContentProps {
  children: ReactNode
  open?: boolean
  className?: string
}

export function CollapsibleContent({ children, open, className }: CollapsibleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.height = open ? `${contentRef.current.scrollHeight}px` : '0px'
    }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={clsx('overflow-hidden transition-all duration-300 ease-out', className)}
      style={{ height: 'auto' }}
    >
      {children}
    </div>
  )
}