import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  size?: 'sm' | 'md' | 'lg'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, size = 'md', leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-4 py-3 text-lg',
    }

    const baseStyles = 'w-full bg-surface-primary border rounded-lg text-text-primary placeholder:text-text-tertiary transition-all duration-150 ease-out'
    const focusStyles = 'focus:border-focus focus:ring-2 focus:ring-brand-500/20 focus:outline-none'
    const disabledStyles = 'disabled:bg-surface-secondary disabled:text-text-tertiary disabled:cursor-not-allowed'
    const errorStyles = error ? 'border-status-error focus:border-status-error focus:ring-status-error/20' : 'border-border-primary'
    const iconStyles = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : ''

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
              {leftIcon}
            </div>
          )}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
              {rightIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(baseStyles, sizes[size], focusStyles, disabledStyles, errorStyles, iconStyles, className)}
            aria-describedby={clsx(hintId, errorId)}
            aria-invalid={!!error}
            {...props}
          />
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

Input.displayName = 'Input'