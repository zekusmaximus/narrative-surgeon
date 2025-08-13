import React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'destructive' | 'ghost' | 'link' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  asChild?: boolean
}

/**
 * Minimal Button to satisfy imports and TS types.
 * Styles are intentionally basic; consumers can pass className.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className, children, asChild, ...props }, ref) => {
    const padding =
      size === 'sm' ? '6px 10px' : size === 'lg' ? '10px 16px' : '8px 12px'
    const bg =
      variant === 'secondary' ? '#e9ecef'
      : variant === 'destructive' ? '#dc3545'
      : variant === 'ghost' ? 'transparent'
      : variant === 'link' ? 'transparent'
      : variant === 'outline' ? 'transparent'
      : '#0d6efd'
    const color =
      variant === 'ghost' || variant === 'link' || variant === 'outline' ? '#0d6efd'
      : variant === 'destructive' ? '#fff'
      : '#fff'
    const border =
      variant === 'outline' ? '1px solid #0d6efd' : '1px solid transparent'
    const textDecoration = variant === 'link' ? 'underline' : 'none'

    return (
      <button
        ref={ref}
        className={className}
        style={{
          padding,
          background: bg,
          color,
          border,
          borderRadius: 6,
          cursor: 'pointer',
          textDecoration,
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export default Button
