'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Package, Send } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { orderService, type VendorOrder } from '@/features/orders/services/order-service'
import { statusLabel, statusTone } from '@/features/seller/types/seller.types'

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const date = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : 'Date unavailable'

export function OrderDetailsPage({ setView: _setView }: { setView: (view: 'orders') => void }) {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<VendorOrder>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const load = () => { setLoading(true); orderService.get(orderId).then(setOrder).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load order')).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [orderId])
  const advance = async () => { if (!order) return; setSaving(true); setError(''); try { if (order.status === 'PACKED') await orderService.ship(order._id); else await orderService.pack(order._id); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update order') } finally { setSaving(false) } }
  if (loading) return <main className="workspace"><p className="subtle">Loading order…</p></main>
  if (!order) return <main className="workspace"><div className="auth-notice error" role="alert">{error || 'Order unavailable.'}</div></main>
  const address = order.parent?.shippingAddressSnapshot || {}
  const canAdvance = (['PAID', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'].includes(order.status) && order.parent?.paymentStatus === 'PAID') || order.status === 'PACKED'
  return <main className="workspace"><PageHeader eyebrow={`Fulfilment / ${order._id.slice(-8).toUpperCase()}`} title="Order detail" description={`${date(order.createdAt)} · ${order.items.length} vendor item${order.items.length === 1 ? '' : 's'}`} action={<button className="secondary-button" onClick={() => { _setView('orders'); router.push('/orders') }}><ArrowLeft /> Back to orders</button>} />{error && <div className="auth-notice error" role="alert">{error}</div>}<div className="detail-grid"><section className="panel detail-card"><div className="detail-title"><div><h2>{order._id.slice(-8).toUpperCase()}</h2><p>Vendor order · Parent order {order.parentOrderId}</p></div><StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge></div><div className="profile-list"><div><span>Payment</span><b>{order.parent?.paymentStatus || 'PENDING'}</b></div><div><span>Order created</span><b>{date(order.createdAt)}</b></div><div><span>Last updated</span><b>{date(order.updatedAt)}</b></div></div>{canAdvance && <button className="primary-button" disabled={saving} onClick={advance}><Send />{saving ? 'Saving…' : order.status === 'PACKED' ? 'Mark shipped' : 'Mark packed'}</button>}</section><section className="panel detail-card"><h2>Customer delivery</h2><div className="info-list"><div><span>Customer reference</span><b>{order.customerId}</b></div>{Object.entries(address).map(([key, value]) => <div key={key}><span>{key.replaceAll('_', ' ')}</span><b>{String(value)}</b></div>)}</div></section><section className="panel detail-card"><h2>Items for your vendor</h2>{order.items.map((item) => <div className="detail-product" key={`${item.productId}-${item.variantId}`}><div className="product-thumb terracotta"><Package /></div><div><b>{item.productName}</b><span>{item.sku}</span><span>Qty {item.quantity} × {money(item.unitPrice)}</span></div><strong>{money(item.lineTotal)}</strong></div>)}<div className="financial-list"><span>Vendor subtotal <b>{money(order.subtotal)}</b></span><span>Vendor discount <b>{money(order.discount)}</b></span><span>Vendor total <b>{money(order.total)}</b></span></div></section></div></main>
}
