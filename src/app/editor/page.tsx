'use client'

import { ProfessionalEditor } from '../../components/editor/ProfessionalEditor'
import { ErrorBoundary } from '../../components/ErrorBoundary'

export default function EditorPage() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Editor page error:', error, errorInfo)
        // In production, this could send to error tracking service
      }}
    >
      <ProfessionalEditor />
    </ErrorBoundary>
  )
}