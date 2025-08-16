'use client'

import { useParams } from 'next/navigation'
import { ProfessionalEditor } from '../../../../components/editor/ProfessionalEditor'
import { ErrorBoundary } from '../../../../components/ErrorBoundary'

export default function EditorPage() {
  const params = useParams()
  const manuscriptId = params.id as string

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Editor page error:', error, errorInfo)
        // In production, this could send to error tracking service
      }}
    >
      <ProfessionalEditor 
        manuscriptId={manuscriptId}
      />
    </ErrorBoundary>
  )
}