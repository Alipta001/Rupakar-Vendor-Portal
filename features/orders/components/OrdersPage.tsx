'use client'

import { useEffect, useState } from 'react'
import { Check, ClipboardList, Package, Search, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { orderService, type VendorOrder, type VendorOrderStatus } from '@/features/orders/services/order-service'
import { statusLabel, statusTone } from '@/features/seller/types/seller.types'
import type { View } from '@/features/seller/types/view.types'

const statuses: Array<{ label: string; value?: VendorOrderStatus }> = [{ label: 'All orders' }, { label: 'Awaiting payment', value: 'PENDING_PAYMENT' }, { label: 'Confirmed', value: 'CONFIRMED' }, { label: 'Processing', value: 'PROCESSING' }, { label: 'Ready to ship', value: 'READY_TO_SHIP' }, { label: 'Shipped', value: 'SHIPPED' }, { label: 'Delivered', value: 'DELIVERED' }]
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const orderDate = (order: VendorOrder) => order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'Date unavailable'

export function OrdersPage({ setView: _setView, setSelected: _setSelected }: { setView: (view: View) => void; setSelected: (order: never) => void }) {
  const router = useRouter()
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [filter, setFilter] = useState<VendorOrderStatus>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 20

  const load = () => { setLoading(true); setError(''); orderService.list({ page, limit, status: filter, search }).then((result) => { setOrders(result.items); setTotal(result.total) }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load seller orders')).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [page, filter, search])
  const visible = orders
  const open = (id: string) => { router.push(`/orders/${id}`) }
  const counts = { awaiting: orders.filter((order) => order.status === 'PENDING_PAYMENT').length, processing: orders.filter((order) => ['PROCESSING', 'CONFIRMED', 'READY_TO_SHIP', 'PACKED'].includes(order.status)).length, transit: orders.filter((order) => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status)).length, delivered: orders.filter((order) => order.status === 'DELIVERED').length }
  const pageCount = Math.max(1, Math.ceil(total / limit))

  return <><PageHeader eyebrow="Fulfilment" title="Orders" description="Manage the orders assigned to your vendor account." /><div className="metrics-grid"><MetricCard label="Awaiting payment" value={String(counts.awaiting)} change="Current page" icon={ClipboardList} /><MetricCard label="Processing" value={String(counts.processing)} change="Current page" icon={Package} accent="blue" /><MetricCard label="In transit" value={String(counts.transit)} change="Current page" icon={Truck} accent="green" /><MetricCard label="Delivered" value={String(counts.delivered)} change="Current page" icon={Check} accent="purple" /></div><section className="panel table-panel"><div className="tabs inventory-tabs">{statuses.map((item) => <button key={item.label} className={filter === item.value ? 'active' : !filter && !item.value ? 'active' : ''} onClick={() => { setFilter(item.value); setPage(1) }}>{item.label}</button>)}</div><div className="toolbar"><div className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, SKU..." /></div></div>{error && <div className="auth-notice error" role="alert">{error}</div>}{loading ? <p className="subtle">Loading orders…</p> : visible.length === 0 ? <div className="empty-state"><h2>No seller orders found</h2><p className="subtle">Orders assigned to your approved vendor account will appear here.</p></div> : <div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer / product</th><th>Amount</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>{visible.map((order) => { return <tr key={order._id}><td><button className="link-button" onClick={() => open(order._id)}>{order._id.slice(-8).toUpperCase()}</button><small>{orderDate(order)}</small></td><td><b>{order.items[0]?.productName || 'Product unavailable'}</b><small>{order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.items[0]?.sku || 'No SKU'}</small></td><td><b>{money(order.total)}</b><small>{order.items.reduce((sum, item) => sum + item.quantity, 0)} units</small></td><td><StatusBadge tone={order.parent?.paymentStatus === 'PAID' ? 'success' : 'warning'}>{order.parent?.paymentStatus || 'PENDING'}</StatusBadge></td><td><StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge></td><td><button className="tiny-button" onClick={() => open(order._id)}>View</button></td></tr> })}</tbody></table></div>}<div className="table-footer"><span>Showing <b>{visible.length ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)}` : '0'}</b> of {total} orders</span><div><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button><button className="current">{page}</button><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>›</button></div></div></section></>
}
