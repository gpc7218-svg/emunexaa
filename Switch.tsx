import { forwardRef, InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  hint?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, hint, size = 'md', id, ...props }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).substring(2, 9)}`
    const hintId = hint ? `${switchId}-hint` : undefined

    const sizes = {
      sm: 'h-5 w-9',
      md: 'h-6 w-11',
      lg: 'h-7 w-13',
    }

    const thumbSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }

    const thumbTranslate = {
      sm: 'translate-x-4',
      md: 'translate-x-5',
      lg: 'translate-x-6',
    }

    return (
      <div className={clsx('flex items-start gap-3', className)}>
        <div className="relative flex items-center" style={{ width: sizes[size] }}>
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            className="peer sr-only"
            aria-describedby={hintId}
            {...props}
          />
          <label
            htmlFor={switchId}
            className={clsx(
              'block w-full rounded-full cursor-pointer transition-colors duration-200',
              'bg-surface-tertiary border border-border-primary',
              'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/50',
              'peer-checked:bg-brand-600 peer-checked:border-brand-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span
              className={clsx(
                'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-out',
                thumbSizes[size],
                'peer-checked:' + thumbTranslate[size]
              )}
            />
          </label>
        </div>
        <div className="pt-1 min-w-0">
          <label htmlFor={switchId} className="font-medium text-text-primary cursor-pointer">
            {label}
          </label>
          {hint && (
            <p id={hintId} className="form-hint mt-0.5">
              {hint}
            </p>
          )}
        </div>
      </div>
    )
  }
)

Switch.displayName = 'Switch'