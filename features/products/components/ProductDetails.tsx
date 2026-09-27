'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Edit3, Send, Trash2, PackageX, AlertCircle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { productService, type InventoryItem, type SellerProduct } from '@/features/products/services/product-service'
import { statusLabel, statusTone } from '@/features/seller/types/seller.types'

export function ProductDetails() {
  const { productId } = useParams<{ productId: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<SellerProduct>()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([productService.get(productId), productService.inventory({ limit: 100 })])
      .then(([loadedProduct, loadedInventory]) => {
        setProduct(loadedProduct)
        setInventory(loadedInventory.items)
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load product'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [productId])

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await productService.submit(productId)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit product')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkOutOfStock = async () => {
    if (!window.confirm('Are you sure you want to mark all variants of this product as out of stock?')) return
    setActionLoading(true)
    setError('')
    try {
      await productService.setOutOfStock(productId)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to set product out of stock')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return
    setActionLoading(true)
    setError('')
    try {
      await productService.delete(productId)
      router.push('/products')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete product')
      setActionLoading(false)
    }
  }

  if (loading) return <main className="workspace"><p className="subtle">Loading product…</p></main>
  if (!product) return <main className="workspace"><div className="auth-notice error" role="alert">{error || 'Product unavailable.'}</div></main>

  const canDelete = ['DRAFT', 'REJECTED', 'UNPUBLISHED'].includes(product.status)
  const canEdit = true

  const totalAvailableStock = product.variants?.reduce((sum, variant) => {
    const vId = String(variant._id || variant.id || '')
    const stock = inventory.find((item) => {
      const itemVId = typeof item.variantId === 'object' && item.variantId !== null
        ? String(item.variantId._id || item.variantId.id || '')
        : String(item.variantId || '')
      return itemVId === vId
    })
    const available = stock ? stock.availableQuantity : (typeof variant.availableStock === 'number' ? variant.availableStock : typeof variant.stock === 'number' ? variant.stock : 0)
    return sum + available
  }, 0) ?? (typeof product.availableStock === 'number' ? product.availableStock : product.stock ?? 0)

  return (
    <main className="workspace">
      <PageHeader
        eyebrow="Catalog / Product"
        title={product.name}
        description={product.shortDescription || 'Seller product details.'}
        action={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="secondary-button" onClick={() => router.push('/products')}>
              <ArrowLeft size={16} /> Products
            </button>
            {canEdit && (
              <button className="primary-button" onClick={() => router.push(`/products/${product.id}/edit`)}>
                <Edit3 size={16} /> Edit
              </button>
            )}
            {canDelete && (
              <button
                className="secondary-button"
                style={{ color: '#c93b2b', borderColor: '#c93b2b' }}
                disabled={actionLoading}
                onClick={handleDelete}
              >
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>
        }
      />

      {error && <div className="auth-notice error" role="alert">{error}</div>}

      {product.status === 'EDITED' && (
        <div className="auth-notice info" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
          This product was edited after approval. It is temporarily unpublished and waiting for administrative review.
        </div>
      )}

      {(product.status === 'APPROVED' || product.status === 'PUBLISHED') && (
        <div className="auth-notice info" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
          Editing this product will update its status to Edited, unpublishing it temporarily until re-approved by marketplace admin.
        </div>
      )}

      <div className="profile-grid">
        <section className="panel profile-card">
          <div className="panel-heading">
            <h2>Listing status</h2>
            <StatusBadge tone={statusTone(product.status)}>{statusLabel(product.status)}</StatusBadge>
          </div>
          <p>{product.description || 'No detailed description provided.'}</p>
          {product.rejectionReason && (
            <div className="auth-notice error">
              <strong>Rejection reason:</strong> {product.rejectionReason}
            </div>
          )}
          {['DRAFT', 'REJECTED', 'UNPUBLISHED'].includes(product.status) && (
            <button className="primary-button" disabled={submitting} onClick={submit}>
              <Send size={16} /> {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          )}
        </section>

        <section className="panel profile-card">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Variants & inventory</h2>
            {totalAvailableStock > 0 && (
              <button
                className="secondary-button"
                style={{ fontSize: '12px', padding: '4px 10px' }}
                disabled={actionLoading}
                onClick={handleMarkOutOfStock}
              >
                <PackageX size={14} style={{ marginRight: '4px' }} /> Mark Out of Stock
              </button>
            )}
          </div>

          <div className="profile-list">
            {product.variants?.map((variant) => {
              const vId = String(variant._id || variant.id || '')
              const stock = inventory.find((item) => {
                const itemVId = typeof item.variantId === 'object' && item.variantId !== null
                  ? String(item.variantId._id || item.variantId.id || '')
                  : String(item.variantId || '')
                return itemVId === vId
              })
              const available = stock
                ? stock.availableQuantity
                : typeof variant.availableStock === 'number'
                ? variant.availableStock
                : typeof variant.stock === 'number'
                ? variant.stock
                : 0
              const reserved = stock
                ? stock.reservedQuantity
                : typeof variant.reservedStock === 'number'
                ? variant.reservedStock
                : 0

              return (
                <div key={variant._id || variant.id || variant.sku}>
                  <span>{variant.sku}</span>
                  <b>
                    ₹{variant.price} · {available > 0 ? `${available} available` : <span style={{ color: '#c93b2b' }}>Out of stock</span>}
                    {reserved > 0 ? ` (${reserved} reserved)` : ''}
                  </b>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

