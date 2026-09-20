'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Coins, Receipt, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { financeService, type LedgerEntry, type LedgerSummary, type PayoutRecord, type SettlementBalance } from '@/features/finance/services/finance-service'

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const date = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : 'Date unavailable'

export function FinancePage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [summary, setSummary] = useState<LedgerSummary>()
  const [balance, setBalance] = useState<SettlementBalance>()
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 20

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    Promise.all([financeService.ledger(page, limit), financeService.summary(), financeService.balance(), financeService.payouts(1, 5)]).then(([ledger, totals, settlement, payoutPage]) => { if (!active) return; setEntries(ledger.items); setTotal(ledger.total); setSummary(totals); setBalance(settlement); setPayouts(payoutPage.items) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load finance records') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page])
  const pageCount = Math.max(1, Math.ceil(total / limit))

  return <main className="workspace"><PageHeader eyebrow="Finance" title="Ledger & settlement readiness" description="Review captured sales and backend-authoritative settlement status." /><div className="metrics-grid"><MetricCard label="Ledger net" value={money(summary?.netAmount || 0)} change={`${summary?.count || 0} posted entries`} icon={Receipt} /><MetricCard label="Eligible balance" value={money(balance?.eligibleAmount || 0)} change="Settlement rules apply" icon={Coins} accent="purple" /><MetricCard label="Available balance" value={money(balance?.availableAmount || 0)} change={balance?.readiness.payoutRequestsEnabled ? 'Provider ready' : 'Transfers disabled'} icon={Wallet} accent="green" /></div>{balance && <section className="panel profile-card"><div className="panel-heading"><div><h2>Settlement readiness</h2><p>{balance.readiness.reason || 'Seller is ready for settlement.'}</p></div><StatusBadge tone={balance.readiness.payoutRequestsEnabled ? 'success' : 'warning'}>{balance.readiness.payoutRequestsEnabled ? 'READY' : 'NOT CONFIGURED'}</StatusBadge></div><div className="profile-list"><div><span>Pending eligibility</span><b>{money(balance.pendingAmount)}</b></div><div><span>Already settled</span><b>{money(balance.settledAmount)}</b></div><div><span>Reserved by payouts</span><b>{money(balance.reservedAmount)}</b></div></div></section>}{error && <div className="auth-notice error" role="alert">{error}</div>}{payouts.length > 0 && <section className="panel table-panel"><div className="panel-heading"><h2>Payout history</h2></div><div className="table-scroll"><table><thead><tr><th>Amount</th><th>Status</th><th>Provider reference</th><th>Date</th></tr></thead><tbody>{payouts.map((payout) => <tr key={payout._id}><td><b>{money(payout.requestedAmount)}</b></td><td><StatusBadge tone={payout.status === 'PAID' ? 'success' : 'warning'}>{payout.status}</StatusBadge></td><td>{payout.providerTransferId || 'Not transferred'}</td><td>{date(payout.createdAt)}</td></tr>)}</tbody></table></div></section>}{loading ? <p className="subtle">Loading ledger…</p> : <section className="panel table-panel"><div className="panel-heading"><div><h2>Sales ledger</h2><p>Historical commission is stored on each captured vendor transaction.</p></div></div>{entries.length === 0 ? <div className="empty-state"><h2>No captured sales yet</h2><p className="subtle">Ledger entries appear after verified payment capture.</p></div> : <div className="table-scroll"><table><thead><tr><th>Transaction</th><th>Vendor order</th><th>Gross</th><th>Commission</th><th>Net</th><th>Status</th><th>Date</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry._id}><td><b>{entry.transactionType.replaceAll('_', ' ')}</b><small>{entry.commissionSource} · {entry.commissionRate}%</small></td><td><span>{entry.vendorOrderId}</span><small>Parent {entry.parentOrderId}</small></td><td>{money(entry.grossAmount)}</td><td>{money(entry.commissionAmount)}</td><td><b>{money(entry.netAmount)}</b></td><td><StatusBadge tone={entry.status === 'POSTED' ? 'success' : 'warning'}>{entry.status}</StatusBadge></td><td>{date(entry.createdAt)}</td></tr>)}</tbody></table></div>}<div className="table-footer"><span>Showing <b>{entries.length ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)}` : '0'}</b> of {total} transactions</span><div><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><button className="current">{page}</button><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div></div></section>}</main>
}
