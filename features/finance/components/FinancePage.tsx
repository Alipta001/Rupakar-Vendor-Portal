'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  History,
  Info,
  PauseCircle,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  financeService,
  type LedgerEntry,
  type LedgerSummary,
  type PayoutRecord,
  type SettlementBalance,
} from '@/features/finance/services/finance-service'
import { MetricCardsSkeleton, TableSkeleton, EmptyState, ErrorState } from '@/components/skeletons'

const money = (value?: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const date = (value?: string) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export function FinancePage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [summary, setSummary] = useState<LedgerSummary>()
  const [balance, setBalance] = useState<SettlementBalance>()
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetchKey, setFetchKey] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const limit = 20

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError('')

    Promise.allSettled([
      financeService.ledger(page, limit, { signal: controller.signal }),
      financeService.summary({ signal: controller.signal }),
      financeService.balance({ signal: controller.signal }),
      financeService.payouts(1, 20, { signal: controller.signal }),
    ])
      .then(([ledgerRes, summaryRes, balanceRes, payoutsRes]) => {
        let anySuccess = false

        if (ledgerRes.status === 'fulfilled' && ledgerRes.value) {
          const lData = ledgerRes.value as any
          setEntries(Array.isArray(lData.items) ? lData.items : Array.isArray(lData) ? lData : [])
          setTotal(Number(lData.total) || (Array.isArray(lData.items) ? lData.items.length : 0))
          anySuccess = true
        }

        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          setSummary(summaryRes.value)
          anySuccess = true
        }

        if (balanceRes.status === 'fulfilled' && balanceRes.value) {
          setBalance(balanceRes.value)
          anySuccess = true
        }

        if (payoutsRes.status === 'fulfilled' && payoutsRes.value) {
          const pData = payoutsRes.value as any
          setPayouts(Array.isArray(pData.items) ? pData.items : Array.isArray(pData) ? pData : [])
          anySuccess = true
        }

        if (!anySuccess) {
          const firstErr = (ledgerRes as PromiseRejectedResult).reason
          setError(firstErr instanceof Error ? firstErr.message : 'Unable to load finance records from server.')
        }
      })
      .catch((cause) => {
        if (cause?.name === 'CanceledError' || cause?.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Unable to load finance records.')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [page, fetchKey])

  const pageCount = Math.max(1, Math.ceil(total / limit))
  const isInitialLoading = loading && entries.length === 0 && !summary && !balance
  const isBackgroundFetching = loading && (entries.length > 0 || !!summary || !!balance)

  return (
    <main className="workspace">
      <PageHeader
        eyebrow="Finance"
        title="Vendor Ledger & Settlements"
        description="Transparent breakdown of your earned sales, marketplace commissions, settlement eligibility, and bank payout history."
      />

      {isInitialLoading ? (
        <MetricCardsSkeleton count={5} />
      ) : (
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <MetricCard
            label="Available for Settlement"
            value={money(balance?.availableAmount)}
            change={balance?.readiness?.payoutRequestsEnabled ? 'Ready for disbursement' : 'Pending bank/account verification'}
            icon={Wallet}
            accent="green"
          />
          <MetricCard
            label="Pending Eligibility"
            value={money(balance?.pendingAmount)}
            change="7-day delivery return protection"
            icon={Clock}
          />
          <MetricCard
            label="On Hold / In Review"
            value={money(balance?.onHoldAmount)}
            change="Dispute or return window lock"
            icon={PauseCircle}
            accent="amber"
          />
          <MetricCard
            label="Total Earned (Net)"
            value={money(summary?.netAmount ?? balance?.ledgerNet)}
            change={`${summary?.count || 0} captured orders`}
            icon={Receipt}
          />
          <MetricCard
            label="Total Paid"
            value={money(balance?.settledAmount)}
            change="Disbursed to your registered bank"
            icon={Coins}
            accent="purple"
          />
        </div>
      )}

      {/* Settlement Readiness & Bank Details Alert */}
      {balance && (
        <section className="panel profile-card" style={{ marginTop: '1.5rem', borderLeft: '4px solid #8a5327' }}>
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 className="text-[#8a5327]" size={20} />
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Settlement Status & Bank Destination</h2>
                <p style={{ fontSize: '12px', color: 'var(--seller-text-muted)', margin: '2px 0 0' }}>
                  {balance.readiness?.reason || 'Your account is verified and ready for standard manual bank settlements.'}
                </p>
              </div>
            </div>
            <StatusBadge tone={balance.readiness?.payoutRequestsEnabled ? 'success' : 'warning'}>
              {balance.readiness?.payoutRequestsEnabled ? 'ACTIVE & VERIFIED' : 'PENDING ACTION'}
            </StatusBadge>
          </div>

          <div className="profile-list" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <span>Bank Account:</span>
              <b>{balance.readiness?.bankAccountPresent ? 'Verified On File' : 'Missing Bank Account'}</b>
            </div>
            <div>
              <span>Disbursement Mode:</span>
              <b>Manual Bank Transfer (NEFT/IMPS)</b>
            </div>
            <div>
              <span>Hold Window:</span>
              <b>7 Days Post-Delivery</b>
            </div>
            <div>
              <span>Min Settlement:</span>
              <b>₹1,000</b>
            </div>
          </div>
        </section>
      )}

      {error && !isInitialLoading && (
        <div className="auth-notice error" role="alert" style={{ margin: '1rem 0' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setFetchKey((k) => k + 1)}
            style={{ marginLeft: 'auto', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            Retry
          </button>
        </div>
      )}

      {isBackgroundFetching && (
        <div className="text-xs text-[var(--seller-text-muted)] animate-pulse" style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={12} className="animate-spin" /> Refreshing finance ledger…
        </div>
      )}

      {/* Payout History Section */}
      <section className="panel table-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-heading">
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Payout History</h2>
            <p style={{ fontSize: '12px', color: 'var(--seller-text-muted)' }}>
              Completed manual bank disbursements from Rupakar with verified bank UTR / transaction references.
            </p>
          </div>
        </div>

        {payouts.length === 0 ? (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <EmptyState
              title="No Payouts Disbursed Yet"
              description="Payouts are automatically batched and transferred via manual bank transfer after customer orders pass their 7-day return window. Your bank transfer reference and UTR numbers will be displayed here."
            />
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Payout Ref</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Bank Reference / UTR</th>
                  <th>Date Processed</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => {
                  const isPaid = payout.status === 'PAID'
                  return (
                    <tr key={payout._id}>
                      <td>
                        <strong>{payout.payoutNumber || `PO-${payout._id.slice(-6).toUpperCase()}`}</strong>
                      </td>
                      <td>
                        <b>{money(payout.requestedAmount || payout.eligibleAmount)}</b>
                      </td>
                      <td>
                        <StatusBadge tone={isPaid ? 'success' : payout.status === 'FAILED' ? 'danger' : 'warning'}>
                          {payout.status}
                        </StatusBadge>
                      </td>
                      <td>
                        {payout.providerTransferId ? (
                          <span style={{ fontFamily: 'monospace', color: '#166534', fontWeight: 500 }}>
                            {payout.providerTransferId}
                          </span>
                        ) : (
                          <span style={{ color: '#827b72', fontSize: '12px' }}>Transfer Pending</span>
                        )}
                      </td>
                      <td>
                        <small>{date(payout.processedAt || payout.createdAt)}</small>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sales Ledger Section */}
      {isInitialLoading ? (
        <section className="panel table-panel" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
          <TableSkeleton rows={6} cols={7} />
        </section>
      ) : (
        <section className="panel table-panel" style={{ marginTop: '1.5rem' }}>
          <div className="panel-heading">
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Sales Ledger</h2>
              <p style={{ fontSize: '12px', color: 'var(--seller-text-muted)' }}>
                Immutable, itemized ledger entries capturing order sales, Rupakar commission, and settlement status.
              </p>
            </div>
          </div>

          {entries.length === 0 ? (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <EmptyState
                title="No Sales Ledger Entries Yet"
                description="Once customers place and pay for orders containing your authentic Bengal crafts, itemized ledger records detailing payment capture, commissions, and net payables will appear here."
              />
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Order Ref</th>
                    <th>Gross Sales</th>
                    <th>Commission</th>
                    <th>Net Payable</th>
                    <th>Eligibility Status</th>
                    <th>Captured Date</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const statusTone =
                      entry.eligibilityStatus === 'SETTLED'
                        ? 'success'
                        : entry.eligibilityStatus === 'ELIGIBLE'
                        ? 'success'
                        : entry.eligibilityStatus === 'ON_HOLD'
                        ? 'warning'
                        : entry.eligibilityStatus === 'REVERSED'
                        ? 'danger'
                        : 'neutral'

                    const parentNum =
                      typeof entry.parentOrderId === 'object' && entry.parentOrderId?.orderNumber
                        ? entry.parentOrderId.orderNumber
                        : String(entry.parentOrderId || '').slice(-8)

                    return (
                      <tr key={entry._id}>
                        <td>
                          <b>{entry.transactionType?.replaceAll('_', ' ')}</b>
                          <small style={{ display: 'block', color: '#827b72' }}>
                            {entry.commissionSource} · {entry.commissionRate}%
                          </small>
                        </td>
                        <td>
                          <span>Order #{parentNum}</span>
                          <small style={{ display: 'block', color: '#827b72', fontFamily: 'monospace' }}>
                            {String(entry.vendorOrderId).slice(-8)}
                          </small>
                        </td>
                        <td>{money(entry.grossAmount)}</td>
                        <td>
                          <span style={{ color: '#827b72' }}>{money(entry.commissionAmount)}</span>
                        </td>
                        <td>
                          <b>{money(entry.netAmount)}</b>
                        </td>
                        <td>
                          <StatusBadge tone={statusTone}>
                            {entry.eligibilityStatus || entry.status}
                          </StatusBadge>
                          {entry.holdReason && (
                            <small style={{ display: 'block', color: '#b45309', fontSize: '10px', marginTop: '2px' }}>
                              {entry.holdReason.replaceAll('_', ' ')}
                            </small>
                          )}
                        </td>
                        <td>
                          <small>{date(entry.createdAt)}</small>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {entries.length > 0 && (
            <div className="table-footer">
              <span>
                Showing <b>{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</b> of {total} transactions
              </span>
              <div>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <button className="current">{page}</button>
                <button
                  disabled={page >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
