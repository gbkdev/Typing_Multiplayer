import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-caret text-ink-950 hover:bg-caret-dim shadow-[0_0_0_1px_rgba(232,193,74,0.3)]',
  secondary:
    'bg-ink-800 text-ink-100 hover:bg-ink-700 border border-ink-600',
  ghost: 'bg-transparent text-ink-300 hover:text-ink-100 hover:bg-ink-800/60',
  danger: 'bg-incorrect/90 text-ink-950 hover:bg-incorrect',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
