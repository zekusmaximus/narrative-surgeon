import React, { useEffect, useMemo, useState } from 'react'
import { invoke as tauriInvoke } from '@tauri-apps/api/core'

type Submission = {
  id: string
  agentName: string
  agency: string
  status: 'submitted' | 'rejected' | 'accepted' | string
  submittedDate?: number
  expectedResponseDate?: number
}

export type SubmissionTrackerProps = {
  manuscriptId: string
}

export const SubmissionTracker: React.FC<SubmissionTrackerProps> = ({ manuscriptId }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [adding, setAdding] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [agency, setAgency] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = (await tauriInvoke('get_submissions', { manuscriptId })) as Submission[] | any
        if (!mounted) return
        if (Array.isArray(res)) {
          setSubmissions(res as Submission[])
        } else {
          setSubmissions([])
        }
      } catch {
        setSubmissions([])
      }
    })()
    return () => { mounted = false }
  }, [manuscriptId])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return submissions
    return submissions.filter(s => s.status === statusFilter)
  }, [submissions, statusFilter])

  const isOverdue = (s: Submission) => {
    if (!s.expectedResponseDate) return false
    return s.expectedResponseDate < Date.now()
  }

  const onAddNew = () => {
    setAdding(true)
  }

  const onSave = async () => {
    const payload = {
      manuscriptId,
      agentName,
      agency,
      status: 'submitted' as const,
      submittedDate: Date.now(),
      expectedResponseDate: Date.now() + 30 * 24 * 60 * 60 * 1000
    }
    await tauriInvoke('create_submission', payload as any)
    setSubmissions(prev => [
      ...prev,
      { id: 'new-sub', ...payload }
    ])
    setAdding(false)
    setAgentName('')
    setAgency('')
  }

  return (
    <div>
      <label htmlFor="status-filter">Filter by status</label>
      <select
        id="status-filter"
        aria-label="Filter by status"
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
      >
        <option value="all">all</option>
        <option value="submitted">submitted</option>
        <option value="rejected">rejected</option>
        <option value="accepted">accepted</option>
      </select>

      <button onClick={onAddNew}>Add Submission</button>

      {adding && (
        <div>
          <label htmlFor="agentName">Agent Name</label>
          <input
            id="agentName"
            aria-label="Agent Name"
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
          />
          <label htmlFor="agency">Agency</label>
          <input
            id="agency"
            aria-label="Agency"
            value={agency}
            onChange={e => setAgency(e.target.value)}
          />
          <button onClick={onSave}>Save</button>
        </div>
      )}

      <ul>
        {filtered.map(s => (
          <li key={s.id}>
            <div>{s.agentName}</div>
            <div>{s.agency}</div>
            <div>{s.status}</div>
            {isOverdue(s) && <div>Overdue</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SubmissionTracker
