import React from 'react'

export type ProgressProps = {
  value?: number
  max?: number
  className?: string
}

/**
 * Minimal Progress component to satisfy imports and typings.
 * Renders a simple progress bar with aria attributes for accessibility.
 */
export const Progress: React.FC<ProgressProps> = ({ value = 0, max = 100, className }) => {
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100))
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: 8,
        background: '#eee',
        borderRadius: 4,
        overflow: 'hidden'
      }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: '#4b9ce2',
          transition: 'width 120ms ease-in-out'
        }}
      />
    </div>
  )
}

export default Progress
