'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Package,
  PackageCheck,
  PackagePlus,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { returnService } from '@/features/returns/services/return-service'
import type {
  DisputeReason,
  InspectionCondition,
  InspectionResult,
  DispositionCategory,
  SellerReturn,
} from '@/features/returns/types/return.types'
import { returnStatusLabel, returnStatusTone } from './ReturnsPage'
import { formatDateTime } from '@/lib/datetime'

const conditionOptions: Array<{ label: string; value: InspectionCondition }> = [
  { label: 'Intact / Original Condition', value: 'INTACT' },
  { label: 'Damaged by Customer', value: 'DAMAGED' },
  { label: 'Used / Worn Item', value: 'USED' },
  { label: 'Tags / Labels Missing', value: 'TAG_MISSING' },
  { label: 'Wrong Item Returned', value: 'WRONG_ITEM' },
  { label: 'Missing Parts / Accessories', value: 'MISSING_PARTS' },
  { label: 'Other Condition', value: 'OTHER' },
]

const disputeReasonOptions: Array<{ label: string; value: DisputeReason }> = [
  { label: 'Wrong item was returned', value: 'WRONG_ITEM_RETURNED' },
  { label: 'Item is used or washed', value: 'ITEM_USED' },
  { label: 'Item was damaged by customer', value: 'ITEM_DAMAGED_BY_CUSTOMER' },
  { label: 'Accessories or parts are missing', value: 'MISSING_PARTS' },
  { label: 'Original tags have been removed', value: 'TAG_REMOVED' },
  { label: 'Returned product differs from sold product', value: 'DIFFERENT_PRODUCT' },
  { label: 'Other discrepancy', value: 'OTHER' },
]

const dispositionCategoryOptions: Array<{ label: string; value: DispositionCategory }> = [
  { label: 'Restockable (Return to sellable stock)', value: 'RESTOCKABLE' },
  { label: 'Damaged (Non-restockable)', value: 'DAMAGED' },
  { label: 'Defective (Non-restockable)', value: 'DEFECTIVE' },
  { label: 'Unsaleable (Non-restockable)', value: 'UNSALEABLE' },
  { label: 'Missing Parts (Non-restockable)', value: 'MISSING_PARTS' },
  { label: 'Wrong Item (Non-restockable)', value: 'WRONG_ITEM' },
  { label: 'Authenticity Hold (Non-restockable)', value: 'AUTHENTICITY_HOLD' },
]

export function ReturnDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const returnId = String(params?.returnId || '')

  const [returnDoc, setReturnDoc] = useState<SellerReturn | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')

  // Receive modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [receiveNotes, setReceiveNotes] = useState('')

  // Inspection modal state
  const [showInspectModal, setShowInspectModal] = useState(false)
  const [inspectResult, setInspectResult] = useState<InspectionResult>('PASSED')
  const [inspectCondition, setInspectCondition] = useState<InspectionCondition>('INTACT')
  const [inspectNotes, setInspectNotes] = useState('')
  const [inspectProofImages, setInspectProofImages] = useState('')

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('WRONG_ITEM_RETURNED')
  const [disputeDescription, setDisputeDescription] = useState('')
  const [disputeEvidence, setDisputeEvidence] = useState('')

  // Disposition modal state
  const [showDispositionModal, setShowDispositionModal] = useState(false)
  const [dispositionNotes, setDispositionNotes] = useState('')
  const [itemDispositions, setItemDispositions] = useState<
    Array<{
      returnItemId: string
      disposition: DispositionCategory
      restockableQuantity: number
      nonRestockableQuantity: number
      reason?: string
      notes?: string
    }>
  >([])

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!returnId) return
      setLoading(true)
      setError('')
      returnService
        .getById(returnId, { signal })
        .then((doc) => {
          setReturnDoc(doc)
        })
        .catch((err) => {
          if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
          setError(err instanceof Error ? err.message : 'Unable to load return details')
        })
        .finally(() => {
          setLoading(false)
        })
    },
    [returnId]
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const handleReview = async () => {
    try {
      setActionLoading(true)
      setActionSuccess('')
      const updated = await returnService.review(returnId, reviewNotes)
      setReturnDoc(updated)
      setShowReviewModal(false)
      setActionSuccess('Return request has been acknowledged and marked Under Review.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review return')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReceive = async () => {
    try {
      setActionLoading(true)
      setActionSuccess('')
      const updated = await returnService.markReceived(returnId, receiveNotes)
      setReturnDoc(updated)
      setShowReceiveModal(false)
      setActionSuccess('Return item has been marked as Received at seller facility.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark return as received')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReadyForInspection = async () => {
    try {
      setActionLoading(true)
      setActionSuccess('')
      const updated = await returnService.readyForInspection(returnId)
      setReturnDoc(updated)
      setActionSuccess('Return is now ready for quality inspection.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inspection status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitInspection = async () => {
    if (inspectResult === 'FAILED' && !inspectNotes.trim()) {
      alert('Please provide a reason/notes explaining why the inspection failed.')
      return
    }

    try {
      setActionLoading(true)
      setActionSuccess('')
      const proofList = inspectProofImages
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      const updated = await returnService.submitInspection(returnId, {
        result: inspectResult,
        condition: inspectCondition,
        notes: inspectNotes.trim() || undefined,
        proofImages: proofList,
      })
      setReturnDoc(updated)
      setShowInspectModal(false)
      setActionSuccess(
        inspectResult === 'PASSED'
          ? 'Inspection Passed recorded successfully.'
          : 'Inspection Failed recorded. You may now raise a dispute if required.'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit inspection')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRaiseDispute = async () => {
    if (!disputeDescription.trim()) {
      alert('Please provide a description explaining the dispute.')
      return
    }

    try {
      setActionLoading(true)
      setActionSuccess('')
      const evidenceList = disputeEvidence
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      const updated = await returnService.raiseDispute(returnId, {
        reason: disputeReason,
        description: disputeDescription.trim(),
        evidence: evidenceList,
      })
      setReturnDoc(updated)
      setShowDisputeModal(false)
      setActionSuccess('Dispute raised successfully. Case has been routed for Admin review.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise dispute')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitDisposition = async () => {
    if (!itemDispositions.length) {
      alert('No item disposition records to submit.')
      return
    }

    try {
      setActionLoading(true)
      setActionSuccess('')
      const updated = await returnService.submitDisposition(returnId, {
        items: itemDispositions,
        notes: dispositionNotes.trim() || undefined,
      })
      setReturnDoc(updated)
      setShowDispositionModal(false)
      setActionSuccess('Inventory disposition recorded successfully. Restockable items returned to inventory.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record disposition')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-10 w-96 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (!returnDoc) {
    return (
      <div className="p-8">
        <button
          type="button"
          onClick={() => router.push('/returns')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Returns
        </button>
        <div className="panel p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
          <h2 className="mt-2 text-base font-semibold">Return not found</h2>
          <p className="mt-1 text-sm text-gray-500">
            {error || 'The requested return could not be found or you do not have permission to access it.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.push('/returns')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" /> Returns List
        </button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <PageHeader
            eyebrow={`Return Request • ${returnDoc.type}`}
            title={returnDoc.returnNumber}
            description={`Requested on ${returnDoc.requestedAt ? formatDateTime(returnDoc.requestedAt) : 'N/A'}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={returnStatusTone(returnDoc.status)}>
            {returnStatusLabel(returnDoc.status)}
          </StatusBadge>

          {/* State-dependent Action Buttons */}
          {returnDoc.status === 'REQUESTED' && (
            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"
            >
              Review / Acknowledge
            </button>
          )}

          {returnDoc.status === 'APPROVED' && (
            <button
              type="button"
              onClick={() => setShowReceiveModal(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 flex items-center gap-1.5"
            >
              <PackageCheck className="h-4 w-4" /> Mark Return Received
            </button>
          )}

          {returnDoc.status === 'RETURN_RECEIVED' && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleReadyForInspection}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Ready for Inspection
            </button>
          )}

          {returnDoc.status === 'INSPECTION_PENDING' && (
            <button
              type="button"
              onClick={() => {
                setInspectResult('PASSED')
                setInspectCondition('INTACT')
                setInspectNotes('')
                setShowInspectModal(true)
              }}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" /> Submit Inspection
            </button>
          )}

          {returnDoc.status === 'INSPECTION_FAILED' && (
            <button
              type="button"
              onClick={() => {
                setDisputeReason('WRONG_ITEM_RETURNED')
                setDisputeDescription('')
                setShowDisputeModal(true)
              }}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 flex items-center gap-1.5"
            >
              <ShieldAlert className="h-4 w-4" /> Raise Seller Dispute
            </button>
          )}

          {(returnDoc.status === 'INSPECTION_PASSED' || returnDoc.status === 'DISPOSITION_PENDING') &&
            (!returnDoc.disposition || returnDoc.disposition.status !== 'COMPLETED') && (
              <button
                type="button"
                onClick={() => {
                  const initialItems = (returnDoc.items || []).map((it) => ({
                    returnItemId: it._id,
                    disposition: 'RESTOCKABLE' as DispositionCategory,
                    restockableQuantity: it.quantity || 1,
                    nonRestockableQuantity: 0,
                    reason: '',
                    notes: '',
                  }))
                  setItemDispositions(initialItems)
                  setDispositionNotes('')
                  setShowDispositionModal(true)
                }}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <PackagePlus className="h-4 w-4" /> Record Disposition
              </button>
            )}
        </div>
      </div>

      {actionSuccess && (
        <div className="my-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="my-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout: Main Details + Sidebar Timeline */}
      <div className="my-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Product & Return Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Product Items Card */}
          <div className="panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Returned Items ({returnDoc.items?.length || 0})
            </h3>
            <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
              {(returnDoc.items || []).map((item) => {
                const title = item.productSnapshot?.title || item.productSnapshot?.name || 'Product item'
                const sku = item.productSnapshot?.sku || 'N/A'

                return (
                  <div key={item._id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h4>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">SKU: {sku}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                        <span>Quantity: <strong className="text-gray-900 dark:text-gray-100">{item.quantity}</strong></span>
                        <span>Unit Price: <strong className="text-gray-900 dark:text-gray-100">₹{item.unitPrice}</strong></span>
                        <span>Line Total: <strong className="text-gray-900 dark:text-gray-100">₹{item.lineTotal}</strong></span>
                        {item.disposition && (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium">
                            Disposition: {item.disposition.disposition} (Restocked: {item.disposition.restockableQuantity}, Non-restockable: {item.disposition.nonRestockableQuantity})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reason & Customer Information Card */}
          <div className="panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Return Request Reason
            </h3>
            <div className="mt-3 rounded-md bg-gray-50 p-4 dark:bg-gray-900/50">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Reason: {returnStatusLabel(returnDoc.reason)}
              </p>
              {returnDoc.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Customer Comment: &quot;{returnDoc.description}&quot;
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <span className="block font-medium text-gray-500">Order Reference</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{returnDoc.order?.orderNumber || '—'}</span>
              </div>
              <div>
                <span className="block font-medium text-gray-500">Destination / Customer City</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {returnDoc.order?.customer?.city && returnDoc.order?.customer?.state
                    ? `${returnDoc.order.customer.city}, ${returnDoc.order.customer.state}`
                    : 'Customer details safe & scoped'}
                </span>
              </div>
            </div>
          </div>

          {/* Phase 6: Replacement Information Panel */}
          {(returnDoc.type === 'REPLACEMENT' || Boolean(returnDoc.replacement)) && (
            <div className="panel p-5 border-l-4 border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Replacement Order Reference
                </h3>
                <span className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                  {returnDoc.replacement?.status || 'REPLACEMENT_PENDING'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="rounded border border-blue-200 dark:border-blue-900/40 p-3 bg-white dark:bg-gray-900">
                  <span className="block text-gray-500 font-medium">Replacement Order #</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {returnDoc.replacement?.replacementOrderNumber || 'Order creation pending'}
                  </span>
                </div>
                <div className="rounded border border-blue-200 dark:border-blue-900/40 p-3 bg-white dark:bg-gray-900">
                  <span className="block text-gray-500 font-medium">Replacement Quantity</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {returnDoc.replacement?.quantity ?? returnDoc.items?.[0]?.quantity ?? 1} item(s)
                  </span>
                </div>
                <div className="rounded border border-blue-200 dark:border-blue-900/40 p-3 bg-white dark:bg-gray-900">
                  <span className="block text-gray-500 font-medium">Replacement Status</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {returnDoc.replacement?.status || 'APPROVED'}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-blue-800/80 dark:text-blue-300/80">
                This item is approved for equal-item replacement. Full replacement fulfillment and shipping workflow will activate in a subsequent phase.
              </p>
            </div>
          )}

          {/* Inspection Details Section */}
          {returnDoc.inspection && (
            <div className="panel p-5 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  Quality Inspection Result
                </h3>
                <span
                  className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                    returnDoc.inspection.result === 'PASSED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {returnDoc.inspection.result}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <span className="block font-medium text-gray-500">Physical Condition</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {returnDoc.inspection.condition ? returnStatusLabel(returnDoc.inspection.condition) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block font-medium text-gray-500">Inspected At</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {returnDoc.inspection.inspectedAt ? formatDateTime(returnDoc.inspection.inspectedAt) : '—'}
                  </span>
                </div>
              </div>

              {returnDoc.inspection.notes && (
                <div className="mt-3 rounded bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                  <span className="font-semibold block text-gray-900 dark:text-gray-100 mb-1">Inspector Notes:</span>
                  {returnDoc.inspection.notes}
                </div>
              )}

              {/* Proof images if available */}
              {returnDoc.inspection.proofImages && returnDoc.inspection.proofImages.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500 block mb-1.5">Inspection Evidence:</span>
                  <div className="flex flex-wrap gap-2">
                    {returnDoc.inspection.proofImages.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-gray-200 px-2.5 py-1 text-xs text-blue-600 hover:underline dark:border-gray-800 dark:text-blue-400"
                      >
                        Proof #{idx + 1} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory Safety Notice */}
              <div className="mt-4 rounded bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Inventory Safety Notice:</strong> Sellable inventory is not automatically altered. Restocking requires authoritative server-validated disposition.
                </span>
              </div>
            </div>
          )}

          {/* Inventory Disposition Section */}
          {returnDoc.disposition && (
            <div className="panel p-5 border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  Inventory Disposition & Restock Status
                </h3>
                <span
                  className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                    returnDoc.disposition.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {returnDoc.disposition.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
                <div>
                  <span className="block font-medium text-gray-500">Restockable Quantity</span>
                  <span className="font-semibold text-emerald-600 text-sm">
                    {returnDoc.disposition.totalRestockableQuantity ?? 0} unit(s)
                  </span>
                </div>
                <div>
                  <span className="block font-medium text-gray-500">Non-Restockable Quantity</span>
                  <span className="font-semibold text-rose-600 text-sm">
                    {returnDoc.disposition.totalNonRestockableQuantity ?? 0} unit(s)
                  </span>
                </div>
                <div>
                  <span className="block font-medium text-gray-500">Disposed At</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {returnDoc.disposition.disposedAt ? formatDateTime(returnDoc.disposition.disposedAt) : '—'}
                  </span>
                </div>
              </div>

              {returnDoc.disposition.notes && (
                <div className="mt-3 rounded bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                  <span className="font-semibold block text-gray-900 dark:text-gray-100 mb-1">Disposition Notes:</span>
                  {returnDoc.disposition.notes}
                </div>
              )}
            </div>
          )}

          {/* Dispute Details Section */}
          {returnDoc.dispute && (
            <div className="panel p-5 border-l-4 border-l-rose-600">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Seller Dispute Raised
                </h3>
                <span className="rounded bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  {returnDoc.dispute.status ? returnStatusLabel(returnDoc.dispute.status) : 'PENDING ADMIN REVIEW'}
                </span>
              </div>

              <div className="mt-3 text-xs">
                <span className="block font-medium text-gray-500">Dispute Reason</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {returnStatusLabel(returnDoc.dispute.reason)}
                </span>
              </div>

              {returnDoc.dispute.description && (
                <div className="mt-2 rounded bg-rose-50/50 p-3 text-xs text-gray-800 dark:bg-rose-950/20 dark:text-gray-200">
                  <span className="font-semibold block mb-1">Dispute Statement:</span>
                  {returnDoc.dispute.description}
                </div>
              )}

              {returnDoc.dispute.evidence && returnDoc.dispute.evidence.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500 block mb-1.5">Submitted Evidence:</span>
                  <div className="flex flex-wrap gap-2">
                    {returnDoc.dispute.evidence.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-gray-200 px-2.5 py-1 text-xs text-blue-600 hover:underline dark:border-gray-800 dark:text-blue-400"
                      >
                        Evidence #{idx + 1} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-gray-500 italic">
                This dispute is queued for Admin arbitration. Seller dispute resolution actions are disabled.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Status Timeline & Action Summary */}
        <div className="space-y-6">
          <div className="panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Status Timeline
            </h3>

            <div className="mt-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800 space-y-4">
              {/* Requested */}
              <div className="relative">
                <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-amber-600 ring-4 ring-white dark:ring-gray-900" />
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Return Requested</p>
                <p className="text-xs text-gray-400">{returnDoc.requestedAt ? formatDateTime(returnDoc.requestedAt) : '—'}</p>
              </div>

              {/* Reviewed */}
              {returnDoc.reviewedAt && (
                <div className="relative">
                  <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-gray-900" />
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Under Seller Review</p>
                  <p className="text-xs text-gray-400">{formatDateTime(returnDoc.reviewedAt)}</p>
                </div>
              )}

              {/* Received */}
              {returnDoc.receivedAt && (
                <div className="relative">
                  <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-gray-900" />
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Return Received at Seller</p>
                  <p className="text-xs text-gray-400">{formatDateTime(returnDoc.receivedAt)}</p>
                </div>
              )}

              {/* Inspected */}
              {returnDoc.inspection?.inspectedAt && (
                <div className="relative">
                  <span
                    className={`absolute -left-6 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-gray-900 ${
                      returnDoc.inspection.result === 'PASSED' ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  />
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    Inspection: {returnDoc.inspection.result}
                  </p>
                  <p className="text-xs text-gray-400">{formatDateTime(returnDoc.inspection.inspectedAt)}</p>
                </div>
              )}

              {/* Disputed */}
              {returnDoc.dispute?.disputedAt && (
                <div className="relative">
                  <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-4 ring-white dark:ring-gray-900" />
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Dispute Raised</p>
                  <p className="text-xs text-gray-400">{formatDateTime(returnDoc.dispute.disputedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="panel p-5 bg-gray-50/50 dark:bg-gray-900/40 text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Return Guidelines</h4>
            <p>1. Review requests promptly upon customer submission.</p>
            <p>2. Once courier delivers the item to your store or warehouse, mark it as received.</p>
            <p>3. Perform physical quality check (PASS / FAIL). Note any damage or usage.</p>
            <p>4. If customer returned a wrong or damaged item, raise a dispute with clear notes.</p>
          </div>
        </div>
      </div>

      {/* Review Request Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Acknowledge & Review Return
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Confirm that you have reviewed the customer&apos;s return reason and acknowledge the request.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Seller Review Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter internal seller notes..."
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-amber-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReview}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Confirm Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Return Received Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Mark Return as Received
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Confirm that the physical package has arrived at your facility. Next step will be quality inspection.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Receipt Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                placeholder="Package condition upon arrival..."
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReceive}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Confirm Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quality Inspection Modal */}
      {showInspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Submit Quality Inspection
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Inspect the physical returned item and record the verification outcome.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Inspection Result *
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectResult('PASSED')}
                    className={`rounded-md py-2 text-xs font-semibold border transition-colors ${
                      inspectResult === 'PASSED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                        : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    PASS (Item Acceptable)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectResult('FAILED')}
                    className={`rounded-md py-2 text-xs font-semibold border transition-colors ${
                      inspectResult === 'FAILED'
                        ? 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                        : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    FAIL (Item Unacceptable)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Physical Condition *
                </label>
                <select
                  value={inspectCondition}
                  onChange={(e) => setInspectCondition(e.target.value as InspectionCondition)}
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-purple-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                >
                  {conditionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Notes {inspectResult === 'FAILED' ? '(Required for FAIL)' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder={
                    inspectResult === 'FAILED'
                      ? 'Detailed explanation of why inspection failed...'
                      : 'Verification comments...'
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-purple-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Proof Image URLs (One per line, optional)
                </label>
                <textarea
                  rows={2}
                  value={inspectProofImages}
                  onChange={(e) => setInspectProofImages(e.target.value)}
                  placeholder="https://... image link"
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-xs font-mono focus:border-purple-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInspectModal(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSubmitInspection}
                className="rounded-md bg-purple-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Save Inspection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              Raise Seller Return Dispute
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Submit a formal dispute if customer returned an invalid, used, or substituted product. An Admin will arbitrate.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Dispute Reason *
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-rose-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                >
                  {disputeReasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Detailed Explanation *
                </label>
                <textarea
                  rows={4}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Explain exactly why the return is invalid (e.g. wrong brand received, tags deliberately removed, damaged by customer)..."
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-rose-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Evidence Image URLs (One per line, optional)
                </label>
                <textarea
                  rows={2}
                  value={disputeEvidence}
                  onChange={(e) => setDisputeEvidence(e.target.value)}
                  placeholder="https://... photo link"
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-xs font-mono focus:border-rose-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRaiseDispute}
                className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Raise Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Disposition Modal */}
      {showDispositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-emerald-600" />
              Record Inventory Disposition
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Categorize returned items for restocking or non-restockable handling. Accepted items marked Restockable will return to available inventory.
            </p>

            <div className="mt-4 space-y-4">
              {itemDispositions.map((itemDisp, idx) => {
                const origItem = returnDoc.items?.find((it) => it._id === itemDisp.returnItemId)
                const maxAccepted = origItem?.quantity || 1
                return (
                  <div key={itemDisp.returnItemId} className="rounded border border-gray-200 p-3 text-xs dark:border-gray-800 space-y-2">
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      Item #{idx + 1}: {origItem?.productSnapshot?.title || origItem?.productId} (Accepted: {maxAccepted})
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Disposition Category *
                      </label>
                      <select
                        value={itemDisp.disposition}
                        onChange={(e) => {
                          const newCat = e.target.value as DispositionCategory
                          const updated = [...itemDispositions]
                          const isRestockable = newCat === 'RESTOCKABLE'
                          updated[idx] = {
                            ...updated[idx],
                            disposition: newCat,
                            restockableQuantity: isRestockable ? maxAccepted : 0,
                            nonRestockableQuantity: isRestockable ? 0 : maxAccepted,
                          }
                          setItemDispositions(updated)
                        }}
                        className="mt-1 w-full rounded-md border border-gray-300 p-2 text-xs focus:border-emerald-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                      >
                        {dispositionCategoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Restockable Qty
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={maxAccepted}
                          value={itemDisp.restockableQuantity}
                          disabled={itemDisp.disposition !== 'RESTOCKABLE'}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0)
                            const updated = [...itemDispositions]
                            updated[idx] = {
                              ...updated[idx],
                              restockableQuantity: val,
                              nonRestockableQuantity: Math.max(0, maxAccepted - val),
                            }
                            setItemDispositions(updated)
                          }}
                          className="mt-1 w-full rounded-md border border-gray-300 p-1.5 text-xs focus:border-emerald-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Non-Restockable Qty
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={maxAccepted}
                          value={itemDisp.nonRestockableQuantity}
                          disabled
                          className="mt-1 w-full rounded-md border border-gray-300 p-1.5 text-xs bg-gray-50 dark:border-gray-700 dark:bg-gray-800 opacity-70"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Disposition Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={dispositionNotes}
                  onChange={(e) => setDispositionNotes(e.target.value)}
                  placeholder="Additional notes for warehouse / inventory records..."
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-xs focus:border-emerald-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDispositionModal(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSubmitDisposition}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading ? 'Recording...' : 'Submit Disposition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
