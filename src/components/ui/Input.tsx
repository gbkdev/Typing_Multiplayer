import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-medium text-ink-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'rounded-lg bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caret focus-visible:border-caret',
            error && 'border-incorrect focus-visible:ring-incorrect',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-incorrect">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
