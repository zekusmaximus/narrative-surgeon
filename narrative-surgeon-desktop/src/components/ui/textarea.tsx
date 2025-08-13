import React from 'react'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
}

/**
 * Minimal Textarea component to satisfy imports and typings.
 * Forwards all native textarea props.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={className}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export default Textarea
