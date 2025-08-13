import React from 'react'

export type BadgeProps = React.PropsWithChildren<{
  className?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning'
}>

/**
 * Minimal Badge component to satisfy desktop UI imports and TypeScript types.
 * Styling is intentionally basic; real styling can be added via className.
 */
export const Badge: React.FC<BadgeProps> = ({ className, children }) => {
  return (
    <span
      role="status"
      className={className}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 8,
        background: '#eee',
        color: '#333',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  )
}

export default Badge
