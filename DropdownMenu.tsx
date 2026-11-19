import { ReactNode, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface DropdownMenuProps {
  children: ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <>{children}</>
}

interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: ReactNode
}

export function DropdownMenuTrigger({ asChild = false, children }: DropdownMenuTriggerProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setOpen(false)
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const triggerElement = typeof children === 'function' ? children({ open, setOpen }) : children

  if (asChild && typeof children !== 'function') {
    return React.cloneElement(children as React.ReactElement, {
      ref: triggerRef,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        setOpen(!open)
      },
    })
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {triggerElement}
      </button>
      {open && (
        <DropdownMenuPortal>
          <DropdownMenuContent ref={contentRef} />
        </DropdownMenuPortal>
      )}
    </>
  )
}

interface DropdownMenuPortalProps {
  children: ReactNode
}

function DropdownMenuPortal({ children }: DropdownMenuPortalProps) {
  const mount = typeof window !== 'undefined' ? document.body : null
  if (!mount) return null
  return createPortal(children, mount)
}

interface DropdownMenuContentProps {
  ref?: React.RefObject<HTMLDivElement>
  align?: 'start' | 'end'
  children: ReactNode
  className?: string
}

export function DropdownMenuContent({ ref, align = 'start', children, className }: DropdownMenuContentProps) {
  return (
    <div
      ref={ref}
      className={clsx(
        'fixed z-[600] min-w-[160px] bg-surface-primary border border-border-primary rounded-lg shadow-xl p-1 animate-scale-in',
        align === 'end' && 'right-0',
        className
      )}
      role="menu"
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  inset?: boolean
  shortcut?: string
}

export function DropdownMenuItem({ children, onClick, className, disabled = false, inset = false, shortcut }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.()
      }}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-2 w-full px-3 py-2 text-sm text-text-primary rounded-md transition-colors',
        'hover:bg-surface-hover focus:bg-surface-hover focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        inset && 'pl-8',
        className
      )}
      role="menuitem"
      tabIndex={-1}
    >
      {children}
      {shortcut && (
        <span className="ml-auto text-text-tertiary text-xs font-mono">{shortcut}</span>
      )}
    </button>
  )
}

interface DropdownMenuSeparatorProps {
  className?: string
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={clsx('h-px bg-border-primary my-1', className)} role="separator" />
}

interface DropdownMenuLabelProps {
  children: ReactNode
  className?: string
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={clsx('px-3 py-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wide', className)}>
      {children}
    </div>
  )
}

interface DropdownMenuGroupProps {
  children: ReactNode
  className?: string
}

export function DropdownMenuGroup({ children, className }: DropdownMenuGroupProps) {
  return <div className={clsx(className)}>{children}</div>
}

interface DropdownMenuSubProps {
  children: ReactNode
}

export function DropdownMenuSub({ children }: DropdownMenuSubProps) {
  return <>{children}</>
}

interface DropdownMenuSubTriggerProps {
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function DropdownMenuSubTrigger({ children, className, disabled = false }: DropdownMenuSubTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={clsx(
          'flex items-center justify-between w-full px-3 py-2 text-sm text-text-primary rounded-md transition-colors',
          'hover:bg-surface-hover focus:bg-surface-hover focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {children}
        <ChevronRight className="w-4 h-4 text-text-tertiary" />
      </button>
      {open && (
        <div className="absolute left-full top-0 min-w-[160px] bg-surface-primary border border-border-primary rounded-lg shadow-xl p-1 animate-scale-in z-[600]">
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownMenuSubContentProps {
  children: ReactNode
  className?: string
}

export function DropdownMenuSubContent({ children, className }: DropdownMenuSubContentProps) {
  return <div className={clsx(className)}>{children}</div>
}