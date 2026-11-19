import { SelectHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, size = 'md', id, children, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`
    const hintId = hint ? `${selectId}-hint` : undefined
    const errorId = error ? `${selectId}-error` : undefined

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-4 py-3 text-lg',
    }

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'w-full bg-surface-primary border rounded-lg text-text-primary appearance-none bg-no-repeat bg-right pr-10',
              'placeholder:text-text-tertiary',
              'transition-all duration-150 ease-out',
              'focus:border-focus focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
              'disabled:bg-surface-secondary disabled:text-text-tertiary disabled:cursor-not-allowed',
              error ? 'border-status-error focus:border-status-error focus:ring-status-error/20' : 'border-border-primary',
              sizes[size],
              className
            )}
            aria-describedby={clsx(hintId, errorId)}
            aria-invalid={!!error}
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em'
            }}
            {...props}
          >
            {children}
          </select>
        </div>
        {error && (
          <p id={errorId} className="form-error mt-1.5" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="form-hint mt-1.5">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'