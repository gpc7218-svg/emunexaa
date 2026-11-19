import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', dot = false, children, ...props }, ref) => {
    const variants = {
      success: 'bg-status-success/10 text-status-success border-status-success/20',
      warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
      error: 'bg-status-error/10 text-status-error border-status-error/20',
      info: 'bg-status-info/10 text-status-info border-status-info/20',
      neutral: 'bg-surface-tertiary text-text-secondary border-border-primary',
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm',
    }

    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center gap-1.5 font-medium rounded-full border',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={clsx('w-1.5 h-1.5 rounded-full', {
              'bg-status-success': variant === 'success',
              'bg-status-warning': variant === 'warning',
              'bg-status-error': variant === 'error',
              'bg-status-info': variant === 'info',
              'bg-text-tertiary': variant === 'neutral',
            })}
          />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'