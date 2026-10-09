'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, CheckCircle, Download, FileText, MapPin, Package, Printer, RefreshCw, Send, ShieldCheck, Truck, X } from 'lucide-react'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { orderService, type CancellationRequest, type VendorOrder } from '@/features/orders/services/order-service'
import { getApiErrorMessage } from '@/lib/api/errors'
import { statusLabel, statusTone } from '@/features/seller/types/seller.types'
import { OrderDetailSkeleton, ErrorState } from '@/components/skeletons'
import { formatDateTime } from '@/lib/datetime'

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const date = (value?: string) => value ? formatDateTime(value) : 'Date unavailable'

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
  const [fetchKey, setFetchKey] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const load = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError('')
    orderService.get(orderId, { signal: controller.signal })
      .then(setOrder)
      .catch((cause) => {
        if (cause?.name === 'CanceledError' || cause?.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Unable to load order')
      })
      .finally(() => setLoading(false))

    orderService.cancellationRequests({ limit: 50 }, { signal: controller.signal })
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
      setError(getApiErrorMessage(cause, 'Unable to approve cancellation'))
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
      setError(getApiErrorMessage(cause, 'Unable to reject cancellation'))
    } finally {
      setCancellationActionLoading(false)
    }
  }

  useEffect(() => {
    load()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [orderId, fetchKey])

  const [packageWeight, setPackageWeight] = useState<string>('0.5')
  const [packageLength, setPackageLength] = useState<string>('15')
  const [packageWidth, setPackageWidth] = useState<string>('10')
  const [packageHeight, setPackageHeight] = useState<string>('5')

  useEffect(() => {
    if (order?.shipment?.packageInfo) {
      const p = order.shipment.packageInfo
      if (p.weight) setPackageWeight(String(p.weight))
      if (p.length) setPackageLength(String(p.length))
      if (p.width) setPackageWidth(String(p.width))
      if (p.height) setPackageHeight(String(p.height))
    }
  }, [order])

  const address = useMemo(() => order?.parent?.shippingAddressSnapshot || {}, [order])

  const validAction = useMemo(() => {
    if (!order) return null
    if (['PAID', 'CONFIRMED'].includes(order.status)) {
      return { label: 'Start processing', action: 'process' as const }
    }
    if (order.status === 'PROCESSING') {
      return { label: 'Pack order', action: 'pack' as const }
    }
    if (order.status === 'PACKED') {
      return { label: 'Ready to Ship', action: 'readyToShip' as const }
    }
    if (['READY_TO_SHIP', 'PICKUP_REQUESTED'].includes(order.status)) {
      return { label: 'Handover / Ship', action: 'ship' as const }
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
      else if (validAction.action === 'readyToShip') {
        if (order.vendorPickupConfigured === false && !order.shipment?.pickupAddress?.city) {
          setError('Please add your pickup / dispatch address before marking this order Ready to Ship.')
          setSaving(false)
          return
        }
        const w = parseFloat(packageWeight)
        const l = parseFloat(packageLength)
        const wi = parseFloat(packageWidth)
        const h = parseFloat(packageHeight)
        if (isNaN(w) || w <= 0 || w > 100) {
          setError('Please enter a valid package weight between 0.01 kg and 100 kg')
          setSaving(false)
          return
        }
        if (isNaN(l) || l <= 0 || l > 300 || isNaN(wi) || wi <= 0 || wi > 300 || isNaN(h) || h <= 0 || h > 300) {
          setError('Please enter valid package dimensions between 1 cm and 300 cm')
          setSaving(false)
          return
        }
        await orderService.readyToShip(order._id, { weight: w, length: l, width: wi, height: h })
      }
      else if (validAction.action === 'ship') await orderService.ship(order._id)
      load()
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to update order'))
    } finally {
      setSaving(false)
    }
  }

  const downloadShippingLabel = async () => {
    if (!order) return
    setDocumentLoading('shippingLabel')
    setError('')
    try {
      if (order.shipment?.labelUrl && /^https?:\/\//i.test(order.shipment.labelUrl)) {
        const a = document.createElement('a')
        a.href = order.shipment.labelUrl
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.download = `shipping-label-${order.shipment?.trackingNumber || order._id.slice(-8)}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        return
      }
      const blob = await orderService.shippingLabel(order._id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipping-label-${order.shipment?.trackingNumber || order._id.slice(-8)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Shipping label is not ready'))
    } finally {
      setDocumentLoading('')
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
      setError(getApiErrorMessage(cause, 'Document is not ready'))
    } finally {
      setDocumentLoading('')
    }
  }

  if (loading && !order) {
    return (
      <main className="workspace">
        <OrderDetailSkeleton />
      </main>
    )
  }

  if (error && !order) {
    return (
      <main className="workspace">
        <ErrorState
          error={error}
          onRetry={() => {
            setError('')
            setFetchKey((k) => k + 1)
          }}
        />
      </main>
    )
  }

  if (!order) {
    return (
      <main className="workspace">
        <div className="auth-notice error" role="alert">
          Order unavailable.
        </div>
      </main>
    )
  }


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

        {order.status === 'PACKED' && (
          <div className="mt-6 rounded-xl border border-[#E6D8C4] bg-[#FCF8F3] p-5">
            {order.vendorPickupConfigured === false && !order.shipment?.pickupAddress?.city && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900">Pickup / Dispatch Address Required</h4>
                    <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                      Please add your pickup / dispatch address before marking this order Ready to Ship. Carrier pickup, AWB generation, and official shipping labels require an active dispatch hub.
                    </p>
                    <Link
                      href="/settings?tab=pickup"
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#8B5E34] hover:underline"
                    >
                      Configure Pickup Address in Settings &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-[#8B5E34]" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#1E1A17]">Package Details & Dimension Confirmation</h3>
            </div>
            <p className="text-xs text-[#5D4A3C] mb-4">
              Confirm your package specifications before requesting carrier pickup. Rupakar will automatically select the best available delivery service and generate your AWB and shipping label.
            </p>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7A655A] mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  max="100"
                  value={packageWeight}
                  onChange={(e) => setPackageWeight(e.target.value)}
                  className="w-full rounded-lg border border-[#D4C4B0] bg-white px-3 py-2 text-sm text-[#1E1A17] focus:outline-none focus:ring-1 focus:ring-[#8B5E34]"
                  placeholder="0.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7A655A] mb-1">Length (cm)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="300"
                  value={packageLength}
                  onChange={(e) => setPackageLength(e.target.value)}
                  className="w-full rounded-lg border border-[#D4C4B0] bg-white px-3 py-2 text-sm text-[#1E1A17] focus:outline-none focus:ring-1 focus:ring-[#8B5E34]"
                  placeholder="15"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7A655A] mb-1">Width (cm)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="300"
                  value={packageWidth}
                  onChange={(e) => setPackageWidth(e.target.value)}
                  className="w-full rounded-lg border border-[#D4C4B0] bg-white px-3 py-2 text-sm text-[#1E1A17] focus:outline-none focus:ring-1 focus:ring-[#8B5E34]"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[#7A655A] mb-1">Height (cm)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="300"
                  value={packageHeight}
                  onChange={(e) => setPackageHeight(e.target.value)}
                  className="w-full rounded-lg border border-[#D4C4B0] bg-white px-3 py-2 text-sm text-[#1E1A17] focus:outline-none focus:ring-1 focus:ring-[#8B5E34]"
                  placeholder="5"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {order.parent?.paymentStatus === 'PAID' && (
            <button className="secondary-button" disabled={Boolean(documentLoading)} onClick={() => download('invoice')}>
              <Download /> {documentLoading === 'invoice' ? 'Preparing…' : 'Download invoice'}
            </button>
          )}
          {['PACKED', 'READY_TO_SHIP', 'PICKUP_REQUESTED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && (
            <button className="secondary-button" disabled={Boolean(documentLoading)} onClick={() => download('packingSlip')}>
              <Printer /> {documentLoading === 'packingSlip' ? 'Preparing…' : 'Download packing slip'}
            </button>
          )}
          {['READY_TO_SHIP', 'PICKUP_REQUESTED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && (
            <button className="secondary-button" disabled={Boolean(documentLoading)} onClick={downloadShippingLabel}>
              <FileText /> {documentLoading === 'shippingLabel' ? 'Preparing…' : 'Download shipping label'}
            </button>
          )}
          {validAction && (
            <button className="primary-button" disabled={saving} onClick={advance}>
              <Send /> {saving ? 'Saving…' : validAction.label}
            </button>
          )}
        </div>

        {order.shipment && (
          <div className="mt-6 rounded-xl border border-[#E6D8C4] bg-[#FCF8F3] p-5 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E6D8C4]">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#8B5E34]" />
                <span className="font-semibold text-[#1E1A17]">
                  {order.shipment.carrier || (order.shipment.provider === 'shiprocket' ? 'Shiprocket Courier' : 'Rupakar Express Logistics')}
                </span>
                {order.shipment.provider && order.shipment.provider !== 'mock' && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#EDE3D4] text-[#5D4A3C]">
                    {order.shipment.provider}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-medium tracking-wider text-[#7A655A]">Shipment Status:</span>
                <StatusBadge tone={statusTone(order.shipment.status || 'PENDING')}>
                  {order.shipment.status?.replaceAll('_', ' ') || 'PENDING'}
                </StatusBadge>
              </div>
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">AWB / Tracking Number</p>
                <p className="mt-1 font-semibold text-[#1E1A17]">{order.shipment.trackingNumber || 'Pending Assignment'}</p>
                {order.shipment.trackingUrl && (
                  <a className="mt-1 inline-block text-xs text-[#8B5E34] underline" href={order.shipment.trackingUrl} target="_blank" rel="noreferrer">
                    Track carrier package →
                  </a>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Carrier Pickup Status</p>
                <p className="mt-1 font-semibold text-[#1E1A17]">
                  {order.shipment.pickupStatus ? `${order.shipment.pickupStatus} ${order.shipment.pickupScheduledAt ? `(${date(order.shipment.pickupScheduledAt)})` : ''}` : 'Requested'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Package Dimensions & Weight</p>
                <p className="mt-1 font-semibold text-[#1E1A17]">
                  {order.shipment.packageInfo?.weight || packageWeight} kg · {order.shipment.packageInfo?.length || packageLength}×{order.shipment.packageInfo?.width || packageWidth}×{order.shipment.packageInfo?.height || packageHeight} cm
                </p>
              </div>
              {order.shipment.estimatedDeliveryAt ? (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Estimated Delivery</p>
                  <p className="mt-1 font-semibold text-[#1E1A17]">{date(order.shipment.estimatedDeliveryAt)}</p>
                </div>
              ) : order.shipment.pickupAddress?.city ? (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A655A]">Pickup Hub</p>
                  <p className="mt-1 font-semibold text-[#1E1A17]">{order.shipment.pickupAddress.pickupLocationName || order.shipment.pickupAddress.city}</p>
                </div>
              ) : null}
            </div>

            {/* Automatic Fulfillment Stages */}
            <div className="mt-4 pt-3 border-t border-[#E6D8C4]">
              <p className="text-[10px] uppercase font-bold tracking-[0.16em] text-[#7A655A] mb-2">Shipment Fulfillment Stages</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-[#E6D8C4]">
                  <CheckCircle className={`h-4 w-4 shrink-0 ${order.shipment.providerShipmentId || order.shipment.metadata?.shiprocketOrderId ? 'text-emerald-600' : 'text-stone-300'}`} />
                  <span className={order.shipment.providerShipmentId ? 'text-[#1E1A17] font-medium' : 'text-stone-400'}>Order Created</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-[#E6D8C4]">
                  <CheckCircle className={`h-4 w-4 shrink-0 ${order.shipment.carrier && order.shipment.carrier !== 'mock-carrier' ? 'text-emerald-600' : 'text-stone-300'}`} />
                  <span className={order.shipment.carrier ? 'text-[#1E1A17] font-medium' : 'text-stone-400'}>Courier Selected</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-[#E6D8C4]">
                  <CheckCircle className={`h-4 w-4 shrink-0 ${order.shipment.trackingNumber && !order.shipment.trackingNumber.startsWith('TRK-') && !order.shipment.trackingNumber.startsWith('SR') ? 'text-emerald-600' : 'text-stone-300'}`} />
                  <span className={order.shipment.trackingNumber && !order.shipment.trackingNumber.startsWith('TRK-') && !order.shipment.trackingNumber.startsWith('SR') ? 'text-[#1E1A17] font-medium' : 'text-stone-400'}>AWB Assigned</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-[#E6D8C4]">
                  <CheckCircle className={`h-4 w-4 shrink-0 ${order.shipment.labelUrl ? 'text-emerald-600' : 'text-stone-300'}`} />
                  <span className={order.shipment.labelUrl ? 'text-[#1E1A17] font-medium' : 'text-stone-400'}>Label Generated</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded bg-white border border-[#E6D8C4]">
                  <CheckCircle className={`h-4 w-4 shrink-0 ${order.shipment.pickupStatus === 'SCHEDULED' || order.shipment.pickupStatus === 'REQUESTED' || order.shipment.pickupStatus === 'PICKED_UP' ? 'text-emerald-600' : 'text-stone-300'}`} />
                  <span className={order.shipment.pickupStatus === 'SCHEDULED' || order.shipment.pickupStatus === 'REQUESTED' ? 'text-[#1E1A17] font-medium' : 'text-stone-400'}>Pickup Requested</span>
                </div>
              </div>
            </div>

            {(order.shipment.metadata?.awbError || order.shipment.metadata?.labelError || order.shipment.metadata?.pickupError || order.shipment.pickupStatus === 'FAILED' || (!order.shipment.trackingNumber || order.shipment.trackingNumber.startsWith('TRK-') || order.shipment.trackingNumber.startsWith('SR'))) && (
              <div className="mt-3 p-3 rounded-lg border border-amber-300 bg-amber-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-amber-900">
                  <span className="font-semibold">Shipment requires retry:</span>{' '}
                  {(() => {
                    const rawError = order.shipment.metadata?.awbError || order.shipment.metadata?.pickupError || order.shipment.metadata?.labelError || 'Incomplete fulfillment stage';
                    return rawError;
                  })()}
                </div>
                <button
                  type="button"
                  className="secondary-button text-xs py-1 px-3 self-start sm:self-auto"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true)
                    setError('')
                    try {
                      await orderService.retryShipment(order._id)
                      load()
                    } catch (err) {
                      setError(getApiErrorMessage(err, 'Failed to retry shipment fulfillment'))
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} /> Retry Fulfillment
                </button>
              </div>
            )}
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

          {(order.shipment?.pickupAddress && (order.shipment.pickupAddress.street || order.shipment.pickupAddress.city)) ? (
            <section className="panel detail-card">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-5 w-5 text-[#8B5E34]" />
                <h3 className="text-lg font-semibold text-[#1E1A17]">Pickup / Dispatch Location</h3>
              </div>
              <div className="space-y-2 text-sm text-[#4E3D33]">
                {order.shipment.pickupAddress.pickupLocationName && (
                  <p className="font-semibold text-[#1E1A17]">{order.shipment.pickupAddress.pickupLocationName}</p>
                )}
                <p className="whitespace-pre-line leading-6 text-[#3A2E29]">
                  {[
                    order.shipment.pickupAddress.street,
                    [order.shipment.pickupAddress.city, order.shipment.pickupAddress.state, order.shipment.pickupAddress.postalCode].filter(Boolean).join(', '),
                    order.shipment.pickupAddress.country || 'India',
                  ].filter(Boolean).join('\n')}
                </p>
              </div>
            </section>
          ) : order.vendorPickupAddress?.addressLine1 ? (
            <section className="panel detail-card">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-5 w-5 text-[#8B5E34]" />
                <h3 className="text-lg font-semibold text-[#1E1A17]">Pickup / Dispatch Location</h3>
              </div>
              <div className="space-y-2 text-sm text-[#4E3D33]">
                {order.vendorPickupAddress.pickupLocationName && (
                  <p className="font-semibold text-[#1E1A17]">{order.vendorPickupAddress.pickupLocationName}</p>
                )}
                <p className="whitespace-pre-line leading-6 text-[#3A2E29]">
                  {[
                    [order.vendorPickupAddress.addressLine1, order.vendorPickupAddress.addressLine2].filter(Boolean).join(', '),
                    [order.vendorPickupAddress.city, order.vendorPickupAddress.state, order.vendorPickupAddress.pincode].filter(Boolean).join(', '),
                    order.vendorPickupAddress.country || 'India',
                  ].filter(Boolean).join('\n')}
                </p>
                <p className="text-xs text-[#7A655A] italic">
                  Configured store pickup hub — will be snapshotted upon Ready-to-Ship.
                </p>
              </div>
            </section>
          ) : null}

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
