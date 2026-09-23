'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, Download, MapPin, Package, Printer, Send, ShieldCheck, Truck, X } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { orderService, type CancellationRequest, type VendorOrder } from '@/features/orders/services/order-service'
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
  const [documentLoading, setDocumentLoading] = useState('')
  const [cancellations, setCancellations] = useState<CancellationRequest[]>([])
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [cancellationActionLoading, setCancellationActionLoading] = useState(false)

  const load = () => {
    setLoading(true)
    orderService.get(orderId)
      .then(setOrder)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load order'))
      .finally(() => setLoading(false))

    orderService.cancellationRequests({ limit: 50 })
      .then((res) => {
        const list = res?.items || []
        setCancellations(list.filter((c) => String(c.vendorOrderId) === String(orderId) || String(c.orderId) === String(orderId)))
      })
      .catch(() => null)
  }

  const handleApproveCancellation = async (requestId: string) => {
    setCancellationActionLoading(true)
    setError('')
    try {
      await orderService.approveCancellation(requestId)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to approve cancellation')
    } finally {
      setCancellationActionLoading(false)
    }
  }

  const handleRejectCancellation = async (requestId: string) => {
    if (!rejectionReason.trim()) return
    setCancellationActionLoading(true)
    setError('')
    try {
      await orderService.rejectCancellation(requestId, rejectionReason.trim())
      setRejectingId(null)
      setRejectionReason('')
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reject cancellation')
    } finally {
      setCancellationActionLoading(false)
    }
  }

  useEffect(() => { load() }, [orderId])

  const address = useMemo(() => order?.parent?.shippingAddressSnapshot || {}, [order])

  const validAction = useMemo(() => {
    if (!order) return null
    if (['PAID', 'CONFIRMED'].includes(order.status)) {
      return { label: 'Start processing', action: 'process' as const }
    }
    if (order.status === 'PROCESSING') {
      return { label: 'Pack', action: 'pack' as const }
    }
    if (order.status === 'PACKED') {
      return { label: 'Ready to Ship', action: 'readyToShip' as const }
    }
    if (order.status === 'READY_TO_SHIP') {
      return { label: 'Ship', action: 'ship' as const }
    }
    return null
  }, [order])

  const advance = async () => {
    if (!order || !validAction || saving) return
    setSaving(true)
    setError('')
    try {
      if (validAction.action === 'process') await orderService.process(order._id)
      else if (validAction.action === 'pack') await orderService.pack(order._id)
      else if (validAction.action === 'readyToShip') await orderService.readyToShip(order._id)
      else if (validAction.action === 'ship') await orderService.ship(order._id)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update order')
    } finally {
      setSaving(false)
    }
  }

  const download = async (kind: 'invoice' | 'packingSlip') => {
    if (!order) return
    setDocumentLoading(kind)
    setError('')
    try {
      const document = await orderService[kind](order._id)
      window.open(document.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Document is not ready')
    } finally {
      setDocumentLoading('')
    }
  }

  if (loading) return <main className="workspace"><p className="subtle">Loading order…</p></main>
  if (!order) return <main className="workspace"><div className="auth-notice error" role="alert">{error || 'Order unavailable.'}</div></main>

  const customerAddress = [
    address.name,
    address.phone,
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean).join('\n')

  return (
    <main className="workspace space-y-6">
      <PageHeader
        eyebrow={`Fulfilment / ${order._id.slice(-8).toUpperCase()}`}
        title="Order detail"
        description={`${date(order.createdAt)} · ${order.items.length} vendor item${order.items.length === 1 ? '' : 's'}`}
        action={
          <button className="secondary-button" onClick={() => { _setView('orders'); router.push('/orders') }}>
            <ArrowLeft /> Back to orders
          </button>
        }
      />

      {error && <div className="auth-notice error" role="alert">{error}</div>}

      <section className="panel detail-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow mb-2">Vendor order</p>
            <h2 className="text-2xl font-semibold text-[#1E1A17]">{order._id.slice(-8).toUpperCase()}</h2>
            <p className="subtle mt-1">Parent order {order.parentOrderId}</p>
          </div>
          <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#E6D8C4] bg-[#FCF8F3] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Payment</p>
            <p className="mt-2 text-lg font-semibold text-[#1E1A17]">{order.parent?.paymentStatus || 'PENDING'}</p>
          </div>
          <div className="rounded-xl border border-[#E6D8C4] bg-[#FCF8F3] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Created</p>
            <p className="mt-2 text-lg font-semibold text-[#1E1A17]">{date(order.createdAt)}</p>
          </div>
          <div className="rounded-xl border border-[#E6D8C4] bg-[#FCF8F3] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Updated</p>
            <p className="mt-2 text-lg font-semibold text-[#1E1A17]">{date(order.updatedAt)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {order.parent?.paymentStatus === 'PAID' && (
            <button className="secondary-button" disabled={Boolean(documentLoading)} onClick={() => download('invoice')}>
              <Download /> {documentLoading === 'invoice' ? 'Preparing…' : 'Download invoice'}
            </button>
          )}
          {['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && (
            <button className="secondary-button" disabled={Boolean(documentLoading)} onClick={() => download('packingSlip')}>
              <Printer /> {documentLoading === 'packingSlip' ? 'Preparing…' : 'Download packing slip'}
            </button>
          )}
          {validAction && (
            <button className="primary-button" disabled={saving} onClick={advance}>
              <Send /> {saving ? 'Saving…' : validAction.label}
            </button>
          )}
        </div>
        {order.shipment && (
          <div className="mt-5 rounded-xl border border-[#E6D8C4] bg-[#FCF8F3] p-4 text-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Shipment tracking</p>
            <p className="mt-2 font-semibold text-[#1E1A17]">AWB {order.shipment.trackingNumber || 'Pending'}</p>
            {order.shipment.trackingUrl && <a className="mt-1 inline-block text-[#8B5E34] underline" href={order.shipment.trackingUrl} target="_blank" rel="noreferrer">Open tracking</a>}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="panel detail-card">
          {cancellations.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-900">Cancellation Requests</h4>
              </div>
              <div className="space-y-3">
                {cancellations.map((req) => (
                  <div key={req._id} className="rounded-lg border border-amber-200 bg-white p-3 shadow-sm text-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1E1A17]">{req.productName}</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                            req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'APPROVED' ? 'bg-red-100 text-red-800' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#5D4A3C] mt-1">
                          Reason: <strong className="text-[#1E1A17]">{req.reason}</strong>
                          {req.customerNote && <span> — &quot;{req.customerNote}&quot;</span>}
                        </p>
                        <p className="text-xs text-[#7A655A] mt-0.5">
                          Requested Qty: {req.quantity} · Refund: {money(req.refundAmount)}
                        </p>
                        {req.rejectionReason && (
                          <p className="text-xs text-red-700 mt-1">Rejection reason: {req.rejectionReason}</p>
                        )}
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="flex items-center gap-2 pt-2 md:pt-0">
                          {rejectingId === req._id ? (
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                placeholder="Rejection reason..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="text-xs p-1.5 border border-[#D4C4B0] rounded"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={cancellationActionLoading || !rejectionReason.trim()}
                                  onClick={() => handleRejectCancellation(req._id)}
                                  className="px-2.5 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingId(null)
                                    setRejectionReason('')
                                  }}
                                  className="px-2 py-1 text-xs border border-stone-300 rounded text-stone-600 hover:bg-stone-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={cancellationActionLoading}
                                onClick={() => handleApproveCancellation(req._id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve & Refund
                              </button>
                              <button
                                type="button"
                                disabled={cancellationActionLoading}
                                onClick={() => {
                                  setRejectingId(req._id)
                                  setRejectionReason('')
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-5">
            <Package className="h-5 w-5 text-[#C89B3C]" />
            <h3 className="text-lg font-semibold text-[#1E1A17]">Order items</h3>
          </div>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={`${item.productId}-${item.variantId || item.sku}`} className="rounded-xl border border-[#EEE1D0] bg-[#FFFDF9] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#1E1A17]">{item.productName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7A655A]">{item.sku || 'SKU unavailable'}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-[#5D4A3C]">Qty {item.quantity}</p>
                    <p className="mt-1 font-medium text-[#1E1A17]">{money(item.lineTotal || item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-[#5D4A3C]">
                  <span>Unit price</span>
                  <span>{money(item.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="panel detail-card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-[#C89B3C]" />
              <h3 className="text-lg font-semibold text-[#1E1A17]">Customer delivery</h3>
            </div>
            <div className="space-y-3 text-sm text-[#4E3D33]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Customer reference</p>
                <p className="mt-1 font-medium text-[#1E1A17]">{order.customerId}</p>
              </div>
              {customerAddress && (
                <p className="whitespace-pre-line leading-6 text-[#3A2E29]">{customerAddress}</p>
              )}
            </div>
          </section>

          <section className="panel detail-card">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-[#C89B3C]" />
              <h3 className="text-lg font-semibold text-[#1E1A17]">Summary</h3>
            </div>
            <div className="space-y-3 text-sm text-[#4E3D33]">
              <div className="flex items-center justify-between"><span>Subtotal</span><span>{money(order.subtotal || 0)}</span></div>
              <div className="flex items-center justify-between"><span>Discount</span><span>-{money(order.discount || 0)}</span></div>
              <div className="flex items-center justify-between"><span>Tax</span><span>{money(order.tax || 0)}</span></div>
              <div className="flex items-center justify-between"><span>Shipping</span><span>{money(order.shipping || 0)}</span></div>
              <div className="border-t border-[#E7D8C6] pt-3 mt-2 flex items-center justify-between text-base font-semibold text-[#1E1A17]">
                <span>Total</span>
                <span>{money(order.total || 0)}</span>
              </div>
            </div>
          </section>

          <section className="panel detail-card">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-[#C89B3C]" />
              <h3 className="text-lg font-semibold text-[#1E1A17]">Fulfilment</h3>
            </div>
            <div className="space-y-2 text-sm text-[#4E3D33]">
              <div className="flex items-center justify-between"><span>Shipping status</span><span>{statusLabel(order.status)}</span></div>
              <div className="flex items-center justify-between"><span>Payment status</span><span>{order.parent?.paymentStatus || 'PENDING'}</span></div>
              <div className="flex items-center justify-between"><span>Currency</span><span>{order.currency || 'INR'}</span></div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
