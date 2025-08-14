'use client'

import { useParams } from 'next/navigation'
import { ProfessionalEditor } from '../../../../components/editor/ProfessionalEditor'

export default function EditorPage() {
  const params = useParams()
  const manuscriptId = params.id as string

  return (
    <ProfessionalEditor 
      manuscriptId={manuscriptId}
    />
  )
}