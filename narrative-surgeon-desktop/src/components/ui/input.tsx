import React from 'react'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string
}

/**
 * Minimal Input component to satisfy imports and typings.
 * It forwards all native input props.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={className}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export default Input
