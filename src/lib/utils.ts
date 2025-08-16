// Simplified utility function without clsx and tailwind-merge
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}