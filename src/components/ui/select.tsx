import React from 'react'

export type SelectRootProps = React.PropsWithChildren<{
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
}>

/**
 * Minimal, non-portal Select implementation to satisfy imports and typings.
 * Not a full-featured UI lib; intended for compile-time correctness.
 */
export const Select: React.FC<SelectRootProps> = ({ children, className }) => {
  return <div className={className} role="group">{children}</div>
}

export type SelectTriggerProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string
}
export const SelectTrigger = React.forwardRef<HTMLSelectElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    // Render a native select to provide role="combobox" semantics for tests
    return <select ref={ref} className={className} {...props}>{children}</select>
  }
)
SelectTrigger.displayName = 'SelectTrigger'

export type SelectValueProps = { placeholder?: string; className?: string }
export const SelectValue: React.FC<SelectValueProps> = (_props) => null

export type SelectContentProps = React.HTMLAttributes<HTMLDivElement> & { className?: string }
export const SelectContent: React.FC<SelectContentProps> = ({ className, children, ...props }) => {
  // For simplicity, render children directly; SelectItem should typically be used within Trigger as <option>
  return <div className={className} {...props}>{children}</div>
}

export type SelectItemProps = React.OptionHTMLAttributes<HTMLOptionElement> & {
  value: string
  className?: string
}
export const SelectItem: React.FC<SelectItemProps> = ({ children, ...props }) => {
  return <option {...props}>{children}</option>
}

export default Select
