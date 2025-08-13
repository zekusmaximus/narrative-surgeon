export type ToastAction = { label: string; onClick: () => void }
export type ToastOptions = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  duration?: number
  action?: ToastAction
}

/**
 * Minimal toast shim for desktop builds and tests.
 * In-app, callers can replace this with a real toast system.
 */
export function toast(options: ToastOptions) {
  if (typeof window !== 'undefined') {
    const { title, description, variant, action } = options
    // eslint-disable-next-line no-console
    console.info('[toast]', variant ?? 'default', title ?? '', description ?? '', action?.label ?? '')
  }
  return {
    dismiss: () => void 0
  }
}
