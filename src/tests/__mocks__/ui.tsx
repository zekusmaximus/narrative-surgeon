import React from 'react'

// Simple mocked UI primitives used by tests

export const Badge: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <span className={className}>{children}</span>
)

export const Progress: React.FC<{ value?: number; className?: string }> = ({ value = 0, className }) => (
  <div className={className} role="progressbar" aria-valuenow={value}>{`${value}%`}</div>
)

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={className} {...props} />
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={className} {...props} />
)
Textarea.displayName = 'Textarea'

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => (
  <select className={className} {...props}>{children}</select>
)

export const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input type="checkbox" className={className} {...props} />
)

// Very light Dialog mock with common subcomponents
export const Dialog: React.FC<React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>> = ({ children }) => (
  <div role="dialog">{children}</div>
)
export const DialogTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button {...props}>{children}</button>
)
export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div {...props}>{children}</div>
)
export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div {...props}>{children}</div>
)
export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, ...props }) => (
  <h2 {...props}>{children}</h2>
)
export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, ...props }) => (
  <p {...props}>{children}</p>
)
export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div {...props}>{children}</div>
)
export const DialogClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button {...props}>{children}</button>
)

// Toast hook mock
export function useToast() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j: any = (globalThis as any).jest
  const noop = () => {}
  const fn = j && typeof j.fn === 'function' ? j.fn() : noop
  return { toast: fn }
}
