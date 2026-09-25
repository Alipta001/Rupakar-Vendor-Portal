'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, FileCheck2, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { verificationService, type VerificationState } from '@/features/verification/services/verification-service'
import type { View } from '@/features/seller/types/view.types'
import { Skeleton, ErrorState } from '@/components/skeletons'

const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : 'Not available'
const tone = (value: string) => value === 'APPROVED' || value === 'VERIFIED' ? 'success' : value === 'REJECTED' || value === 'SUSPENDED' || value === 'BLOCKED' ? 'danger' : 'warning'

function VerificationSkeleton() {
  return (
    <div className="verification-layout" aria-busy="true" aria-label="Loading verification state">
      <section className="panel verification-hero" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem' }}>
        <Skeleton className="w-16 h-16 rounded-full" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      </section>
      <section className="panel verification-checklist" style={{ padding: '1.5rem' }}>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="check-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Skeleton className="w-6 h-6 rounded-full" />
              <div style={{ flex: 1 }}>
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function VerificationPage({ setView: _setView }: { setView: (view: View) => void }) {
  const [state, setState] = useState<VerificationState>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [documentType, setDocumentType] = useState('IDENTITY')
  const [storageKey, setStorageKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [bankForm, setBankForm] = useState({ accountHolderName: '', accountNumber: '', bankName: '', branchName: '', ifscCode: '', accountType: 'SAVINGS' })

  const load = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError('')
    verificationService.get({ signal: controller.signal })
      .then(setState)
      .catch((cause) => {
        if (cause?.name === 'CanceledError' || cause?.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Unable to load verification')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchKey])

  const submitDocument = async () => {
    if (!storageKey.trim()) {
      setError('Enter the existing document storage key.')
      return
    }
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await verificationService.submitDocument({ documentType, storageKey: storageKey.trim() })
      setStorageKey('')
      setMessage('Document submitted for review.')
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit document')
    } finally {
      setSubmitting(false)
    }
  }

  const submitBank = async () => {
    if (!bankForm.accountHolderName || !bankForm.accountNumber || !bankForm.bankName || !bankForm.ifscCode) {
      setError('Complete the required bank fields.')
      return
    }
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      await verificationService.submitBankAccount(bankForm)
      setBankForm((current) => ({ ...current, accountNumber: '' }))
      setMessage('Bank details submitted. Verification remains pending until reviewed.')
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit bank details')
    } finally {
      setSubmitting(false)
    }
  }

  const checklist = ['IDENTITY', 'BUSINESS_REGISTRATION', 'PAN', 'GST', 'ADDRESS_PROOF', 'BANK_PROOF']

  return (
    <>
      <PageHeader
        eyebrow="Trust & safety"
        title="Seller verification"
        description="View your backend verification state and submit supported document metadata."
      />
      {error && state && <div className="auth-notice error" role="alert">{error}</div>}
      {message && <div className="auth-notice success" role="status"><Check />{message}</div>}

      {loading && !state ? (
        <VerificationSkeleton />
      ) : error && !state ? (
        <ErrorState
          error={error}
          onRetry={() => {
            setError('')
            setFetchKey((k) => k + 1)
          }}
        />
      ) : !state ? (
        <div className="auth-notice error" role="alert">Verification unavailable.</div>
      ) : (
        <div className="verification-layout">
          <section className="panel verification-hero">
            <div className="verified-seal"><ShieldCheck /></div>
            <div>
              <StatusBadge tone={tone(state.vendor.status)}>{label(state.vendor.status)}</StatusBadge>
              <h2>{state.vendor.businessName}</h2>
              <p>Verification status: <b>{label(state.vendor.verificationStatus)}</b>. Approval date: {date(state.vendor.approvedAt)}.</p>
              {state.vendor.rejectionReason && <div className="auth-notice error">{state.vendor.rejectionReason}</div>}
            </div>
          </section>

          <section className="panel verification-checklist">
            <div className="panel-heading">
              <div>
                <h2>Verification checklist</h2>
                <p>Document state is controlled by the backend review workflow.</p>
              </div>
              <span className="progress-pill">
                {checklist.filter((type) => state.documents.find((document) => document.documentType === type)?.status === 'APPROVED').length} of {checklist.length} complete
              </span>
            </div>
            <div className="check-list">
              {checklist.map((type) => {
                const document = state.documents.find((item) => item.documentType === type)
                return (
                  <div key={type}>
                    <Check className={document?.status === 'APPROVED' ? 'check-done' : ''} />
                    <span>
                      <b>{label(type)}</b>
                      <small>{document ? `${label(document.status)}${document.rejectionReason ? ` · ${document.rejectionReason}` : ''}` : 'Not submitted'}</small>
                    </span>
                    <StatusBadge tone={document ? tone(document.status) : 'warning'}>
                      {document ? label(document.status) : 'Missing'}
                    </StatusBadge>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="panel verification-checklist">
            <div className="panel-heading">
              <div>
                <h2>Submit document metadata</h2>
                <p>Binary upload/storage is not available in the existing backend.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                <span>Document type</span>
                <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                  {checklist.map((type) => (
                    <option key={type} value={type}>{label(type)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Existing storage key</span>
                <input value={storageKey} onChange={(event) => setStorageKey(event.target.value)} placeholder="documents/vendor/..." />
              </label>
            </div>
            <button className="primary-button" disabled={submitting} onClick={submitDocument}>
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          </section>

          <section className="panel verification-note">
            <div>
              <h2>Bank information</h2>
              {state.bankAccount ? (
                <p>{state.bankAccount.bankName} · {state.bankAccount.maskedAccountNumber || 'Account on file'} · status pending external verification.</p>
              ) : (
                <div className="form-grid">
                  <label>
                    <span>Account holder</span>
                    <input value={bankForm.accountHolderName} onChange={(event) => setBankForm({ ...bankForm, accountHolderName: event.target.value })} />
                  </label>
                  <label>
                    <span>Account number</span>
                    <input type="password" value={bankForm.accountNumber} onChange={(event) => setBankForm({ ...bankForm, accountNumber: event.target.value })} />
                  </label>
                  <label>
                    <span>Bank name</span>
                    <input value={bankForm.bankName} onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })} />
                  </label>
                  <label>
                    <span>Branch</span>
                    <input value={bankForm.branchName} onChange={(event) => setBankForm({ ...bankForm, branchName: event.target.value })} />
                  </label>
                  <label>
                    <span>IFSC</span>
                    <input value={bankForm.ifscCode} onChange={(event) => setBankForm({ ...bankForm, ifscCode: event.target.value })} />
                  </label>
                  <label>
                    <span>Account type</span>
                    <select value={bankForm.accountType} onChange={(event) => setBankForm({ ...bankForm, accountType: event.target.value })}>
                      <option value="SAVINGS">Savings</option>
                      <option value="CURRENT">Current</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <button className="primary-button" disabled={submitting} onClick={submitBank}>
                    {submitting ? 'Submitting…' : 'Submit bank details'}
                  </button>
                </div>
              )}
              <small>Razorpay marketplace KYC and transfer readiness are not configured.</small>
            </div>
            <FileCheck2 />
          </section>
        </div>
      )}
    </>
  )
}

