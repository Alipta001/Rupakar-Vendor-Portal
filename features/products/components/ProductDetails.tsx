'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Edit3, Send } from 'lucide-react'
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
  const [error, setError] = useState('')
  const load = () => { setLoading(true); Promise.all([productService.get(productId), productService.inventory({ limit: 100 })]).then(([loadedProduct, loadedInventory]) => { setProduct(loadedProduct); setInventory(loadedInventory.items) }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load product')).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [productId])
  const submit = async () => { setSubmitting(true); setError(''); try { await productService.submit(productId); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to submit product') } finally { setSubmitting(false) } }
  if (loading) return <main className="workspace"><p className="subtle">Loading product…</p></main>
  if (!product) return <main className="workspace"><div className="auth-notice error" role="alert">{error || 'Product unavailable.'}</div></main>
  return <main className="workspace"><PageHeader eyebrow="Catalog / Product" title={product.name} description={product.shortDescription || 'Seller product details.'} action={<><button className="secondary-button" onClick={() => router.push('/products')}><ArrowLeft /> Products</button><button className="primary-button" onClick={() => router.push(`/products/${product.id}/edit`)}><Edit3 /> Edit</button></>} />{error && <div className="auth-notice error" role="alert">{error}</div>}<div className="profile-grid"><section className="panel profile-card"><div className="panel-heading"><h2>Listing status</h2><StatusBadge tone={statusTone(product.status)}>{statusLabel(product.status)}</StatusBadge></div><p>{product.description || 'No detailed description provided.'}</p>{product.rejectionReason && <div className="auth-notice error">{product.rejectionReason}</div>}{['DRAFT', 'REJECTED', 'UNPUBLISHED'].includes(product.status) && <button className="primary-button" disabled={submitting} onClick={submit}><Send />{submitting ? 'Submitting…' : 'Submit for review'}</button>}</section><section className="panel profile-card"><h2>Variants & inventory</h2><div className="profile-list">{product.variants?.map((variant) => { const vId = String(variant._id || variant.id || ''); const stock = inventory.find((item) => { const itemVId = typeof item.variantId === 'object' && item.variantId !== null ? String(item.variantId._id || item.variantId.id || '') : String(item.variantId || ''); return itemVId === vId }); const available = stock ? stock.availableQuantity : (typeof variant.availableStock === 'number' ? variant.availableStock : typeof variant.stock === 'number' ? variant.stock : 0); const reserved = stock ? stock.reservedQuantity : (typeof variant.reservedStock === 'number' ? variant.reservedStock : 0); return <div key={variant._id || variant.id || variant.sku}><span>{variant.sku}</span><b>₹{variant.price} · {available} available{reserved > 0 ? ` (${reserved} reserved)` : ''}</b></div> })}</div></section></div></main>
}
