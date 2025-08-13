export type ToastOptions = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  duration?: number
  action?: React.ReactNode
}

/**
 * Minimal toast shim for desktop builds and tests.
 * In-app, callers can replace this with a real toast system.
 */
export function toast(options: ToastOptions) {
  if (typeof window !== 'undefined') {
    // Basic fallback: log to console; a real UI can subscribe to events.
    const { title, description, variant } = options
    // eslint-disable-next-line no-console
    console.info('[toast]', variant ?? 'default', title ?? '', description ?? '')
  }
  return {
    dismiss: () => void 0
  }
}
