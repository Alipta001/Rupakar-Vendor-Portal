'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, MapPin, Package, Printer, Send, ShieldCheck, Truck } from 'lucide-react'
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
  const [documentLoading, setDocumentLoading] = useState('')

  const load = () => {
    setLoading(true)
    orderService.get(orderId)
      .then(setOrder)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load order'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [orderId])

  const advance = async () => {
    if (!order) return
    setSaving(true)
    setError('')
    try {
      if (order.status === 'READY_TO_SHIP') await orderService.ship(order._id)
      else if (order.status === 'PACKED') await orderService.readyToShip(order._id)
      else if (['PAID', 'CONFIRMED'].includes(order.status)) await orderService.process(order._id)
      else await orderService.pack(order._id)
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

  const address = useMemo(() => order?.parent?.shippingAddressSnapshot || {}, [order])
  const canAdvance = ['PAID', 'CONFIRMED', 'PROCESSING', 'PACKED', 'READY_TO_SHIP'].includes(order?.status ?? '') && order?.parent?.paymentStatus === 'PAID'

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
          {canAdvance && (
            <button className="primary-button" disabled={saving} onClick={advance}>
              <Send /> {saving ? 'Saving…' : order.status === 'PACKED' ? 'Mark ready to ship' : order.status === 'READY_TO_SHIP' ? 'Hand to carrier' : ['PAID', 'CONFIRMED'].includes(order.status) ? 'Start processing' : 'Mark packed'}
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
