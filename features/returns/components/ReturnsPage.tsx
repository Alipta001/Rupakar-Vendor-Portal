'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  PackageCheck,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { returnService } from '@/features/returns/services/return-service'
import type { SellerReturn, SellerReturnStatus } from '@/features/returns/types/return.types'
import { TableSkeleton, MetricCardsSkeleton, EmptyState, ErrorState } from '@/components/skeletons'
import { formatDateTime } from '@/lib/datetime'

const returnStatusOptions: Array<{ label: string; value?: SellerReturnStatus }> = [
  { label: 'All returns' },
  { label: 'Requested', value: 'REQUESTED' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Received', value: 'RETURN_RECEIVED' },
  { label: 'Inspection pending', value: 'INSPECTION_PENDING' },
  { label: 'Inspection passed', value: 'INSPECTION_PASSED' },
  { label: 'Inspection failed', value: 'INSPECTION_FAILED' },
  { label: 'Disposition pending', value: 'DISPOSITION_PENDING' },
  { label: 'Disposition completed', value: 'DISPOSITION_COMPLETED' },
  { label: 'Disputed', value: 'DISPUTED' },
]

export const returnStatusTone = (status?: SellerReturnStatus | string | null): string => {
  if (!status) return 'neutral'
  switch (status) {
    case 'INSPECTION_PASSED':
    case 'DISPOSITION_COMPLETED':
    case 'APPROVED':
    case 'COMPLETED':
      return 'success'
    case 'INSPECTION_FAILED':
    case 'REJECTED':
    case 'REJECTED_AFTER_INSPECTION':
      return 'danger'
    case 'DISPUTED':
      return 'danger'
    case 'REQUESTED':
    case 'UNDER_REVIEW':
    case 'RETURN_RECEIVED':
    case 'INSPECTION_PENDING':
    case 'DISPOSITION_PENDING':
    case 'INSPECTING':
      return 'warning'
    default:
      return 'neutral'
  }
}

export const returnStatusLabel = (status?: string | null): string => {
  if (!status || typeof status !== 'string') return 'N/A'
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
}

export function ReturnsPage() {
  const router = useRouter()
  const [returns, setReturns] = useState<SellerReturn[]>([])
  const [filter, setFilter] = useState<SellerReturnStatus | undefined>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 20

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    returnService.list({ page, limit, status: filter, search }, { signal })
      .then((res) => {
        setReturns(res.items || [])
        setTotal(res.total || 0)
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        setError(err instanceof Error ? err.message : 'Unable to load seller returns')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [page, limit, filter, search])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const openReturn = (id: string) => {
    router.push(`/returns/${id}`)
  }

  const counts = {
    requested: returns.filter((r) => r.status === 'REQUESTED' || r.status === 'UNDER_REVIEW').length,
    received: returns.filter((r) => ['APPROVED', 'RETURN_RECEIVED', 'INSPECTION_PENDING'].includes(r.status)).length,
    passed: returns.filter((r) => r.status === 'INSPECTION_PASSED').length,
    disputed: returns.filter((r) => r.status === 'DISPUTED' || r.status === 'INSPECTION_FAILED').length,
  }

  const pageCount = Math.max(1, Math.ceil(total / limit))

  return (
    <>
      <PageHeader
        eyebrow="Fulfilment & Returns"
        title="Returns & Replacements"
        description="Review customer return requests, acknowledge received items, submit inspections, and manage disputes."
      />

      {loading && returns.length === 0 ? (
        <MetricCardsSkeleton count={4} />
      ) : (
        <div className="metrics-grid">
          <MetricCard
            label="Pending Review"
            value={String(counts.requested)}
            change="Current page"
            icon={RotateCcw}
            accent="orange"
          />
          <MetricCard
            label="Received / Inspecting"
            value={String(counts.received)}
            change="Current page"
            icon={PackageCheck}
            accent="blue"
          />
          <MetricCard
            label="Inspection Passed"
            value={String(counts.passed)}
            change="Current page"
            icon={CheckCircle2}
            accent="green"
          />
          <MetricCard
            label="Failed / Disputed"
            value={String(counts.disputed)}
            change="Current page"
            icon={ShieldAlert}
            accent="purple"
          />
        </div>
      )}

      <div className="panel my-6 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by return # or order #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-amber-600 focus:outline-none dark:border-gray-800 dark:bg-gray-900"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {returnStatusOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setFilter(opt.value)
                  setPage(1)
                }}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-amber-600 text-white dark:bg-amber-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorState error={error} onRetry={() => load()} />}

        {loading ? (
          <TableSkeleton rows={5} columns={9} />
        ) : returns.length === 0 ? (
          <EmptyState
            title="No returns found"
            description={search || filter ? 'No returns match your active filters.' : 'There are no customer returns for your products at this time.'}
          />
        ) : (
          <div className="mt-4 w-full overflow-x-auto overscroll-x-contain pb-2">
            <table className="w-full min-w-[980px] text-left text-sm border-collapse">
              <thead className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Return #</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Order #</th>
                  <th className="py-3 px-3.5 min-w-[180px]">Product</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Qty</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Type</th>
                  <th className="py-3 px-3.5 min-w-[150px]">Reason</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Requested Date</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {returns.map((ret) => {
                  const firstItem = ret.items?.[0]
                  const itemTitle = firstItem?.productSnapshot?.title || firstItem?.productSnapshot?.name || 'Product item'
                  const totalQty = (ret.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0)

                  return (
                    <tr
                      key={ret._id}
                      onClick={() => openReturn(ret._id)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {ret.returnNumber}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-300">
                        {ret.order?.orderNumber || '—'}
                      </td>
                      <td className="py-3.5 px-3.5 max-w-[240px] text-gray-800 dark:text-gray-200 font-medium" title={itemTitle}>
                        <div className="truncate">
                          {itemTitle}
                          {(ret.items || []).length > 1 && (
                            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                              +{ret.items.length - 1} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-center text-gray-700 dark:text-gray-300 font-semibold">
                        {totalQty}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        <span className="text-xs uppercase font-medium tracking-wider bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          {ret.type || 'RETURN'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 max-w-[200px] text-gray-600 dark:text-gray-300" title={returnStatusLabel(ret.reason || 'Customer request')}>
                        <div className="truncate">
                          {returnStatusLabel(ret.reason || 'Customer request')}
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <StatusBadge tone={returnStatusTone(ret.status)}>
                          {returnStatusLabel(ret.status)}
                        </StatusBadge>
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {ret.requestedAt ? formatDateTime(ret.requestedAt) : '—'}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
                          {ret.status === 'REQUESTED' && (
                            <button
                              type="button"
                              onClick={() => openReturn(ret._id)}
                              className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
                            >
                              Review
                            </button>
                          )}
                          {ret.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => openReturn(ret._id)}
                              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Mark Received
                            </button>
                          )}
                          {(ret.status === 'RETURN_RECEIVED' || ret.status === 'INSPECTION_PENDING') && (
                            <button
                              type="button"
                              onClick={() => openReturn(ret._id)}
                              className="rounded-md bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-700 flex items-center gap-1"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                          )}
                          {ret.status === 'INSPECTION_FAILED' && (
                            <button
                              type="button"
                              onClick={() => openReturn(ret._id)}
                              className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Dispute
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openReturn(ret._id)}
                            className="rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800 text-xs text-gray-500">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} returns
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-200 px-2.5 py-1 disabled:opacity-50 dark:border-gray-800"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-200 px-2.5 py-1 disabled:opacity-50 dark:border-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
