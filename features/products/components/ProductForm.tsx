'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronRight, Package, ShieldCheck, X } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { productService, type LookupItem, type ProductInput, type SellerProduct } from '@/features/products/services/product-service'
import type { View } from '@/features/seller/types/view.types'

type FormState = { name: string; shortDescription: string; description: string; categoryId: string; brandId: string; tags: string; sku: string; price: string; compareAtPrice: string; stock: string; imageUrl: string; imageStorageKey: string; originState: string; deliveryDays: string; gstIncluded: boolean }
type AdditionalVariant = { sku: string; price: string; compareAtPrice: string }
const blank: FormState = { name: '', shortDescription: '', description: '', categoryId: '', brandId: '', tags: '', sku: '', price: '', compareAtPrice: '', stock: '0', imageUrl: '', imageStorageKey: '', originState: '', deliveryDays: '7', gstIncluded: false }
const sections = ['Basic information', 'Pricing & inventory', 'Shipping & authenticity', 'SEO & publish']

const toForm = (product: SellerProduct): FormState => {
  const variant = product.variants?.[0]
  const image = Array.isArray(product.images) ? product.images[0] : undefined
  return { ...blank, name: product.name, shortDescription: product.shortDescription || '', description: product.description || '', categoryId: typeof product.categoryId === 'string' ? product.categoryId : product.categoryId?._id || product.categoryId?.id || '', brandId: typeof product.brandId === 'string' ? product.brandId : product.brandId?._id || product.brandId?.id || '', tags: product.tags?.join(', ') || '', sku: variant?.sku || '', price: variant?.price ? String(variant.price) : '', compareAtPrice: variant?.compareAtPrice ? String(variant.compareAtPrice) : '', imageUrl: typeof image === 'string' ? image : image?.url || '', imageStorageKey: typeof image === 'string' ? image : image?.storageKey || '', originState: '', deliveryDays: '7', gstIncluded: false }
}

export function ProductForm({ setView }: { setView: (view: View) => void }) {
  const params = useParams<{ productId?: string }>()
  const router = useRouter()
  const productId = params.productId
  const [form, setForm] = useState(blank)
  const [additionalVariants, setAdditionalVariants] = useState<AdditionalVariant[]>([])
  const [step, setStep] = useState(0)
  const [product, setProduct] = useState<SellerProduct>()
  const [categories, setCategories] = useState<LookupItem[]>([])
  const [brands, setBrands] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(Boolean(productId))
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const update = (key: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    Promise.all([productService.categories(), productService.brands()]).then(([categoryResult, brandResult]) => { setCategories(categoryResult.items); setBrands(brandResult.items) }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load product options'))
  }, [])
  useEffect(() => {
    if (!productId) return
    productService.get(productId).then((result) => { setProduct(result); setForm(toForm(result)); setAdditionalVariants(result.variants.slice(1).map((variant) => ({ sku: variant.sku, price: String(variant.price), compareAtPrice: variant.compareAtPrice == null ? '' : String(variant.compareAtPrice) }))) }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load product')).finally(() => setLoading(false))
  }, [productId])

  const payload = (): ProductInput => ({
    name: form.name.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId || undefined,
    brandId: form.brandId || undefined,
    tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    variants: [{ sku: form.sku.trim(), price: Number(form.price), compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null, status: 'ACTIVE' }, ...additionalVariants.filter((variant) => variant.sku.trim() && Number(variant.price)).map((variant) => ({ sku: variant.sku.trim(), price: Number(variant.price), compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null, status: 'ACTIVE' as const }))],
    images: form.imageUrl ? [{ storageKey: form.imageStorageKey.trim() || form.imageUrl.trim(), url: form.imageUrl.trim(), isPrimary: true, sortOrder: 0 }] : [],
    shipping: { originState: form.originState.trim() || undefined, deliveryDays: Number(form.deliveryDays) || undefined },
    tax: { taxable: true, gstIncluded: form.gstIncluded },
  })

  const save = async (submit = false) => {
    setError(''); setNotice('')
    if (!form.name.trim() || !form.sku.trim() || !Number(form.price)) { setError('Name, SKU, and a price greater than zero are required.'); setStep(0); return }
    setSaving(true)
    try {
      const saved = productId ? await productService.update(productId, payload()) : await productService.create(payload())
      if (Number(form.stock) > 0 && saved.variants?.[0]) await productService.adjustInventory(saved.variants[0]._id || saved.variants[0].id || '', Number(form.stock), 'INITIAL_STOCK')
      if (submit) await productService.submit(saved.id)
      setProduct(saved); setNotice(submit ? 'Product submitted for review.' : 'Draft saved.')
      if (!productId) router.replace(`/products/${saved.id}/edit`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save product') } finally { setSaving(false) }
  }

  if (loading) return <main className="workspace"><p className="subtle">Loading product…</p></main>
  return <><PageHeader eyebrow={`Catalog / ${productId ? 'Edit product' : 'New product'}`} title={productId ? 'Edit product' : 'Add product'} description="Create a complete listing ready for review." action={<button className="secondary-button" onClick={() => { setView('products'); router.push('/products') }}><X /> Cancel</button>} /><div className="product-editor"><aside className="editor-steps">{sections.map((label, index) => <button key={label} className={step === index ? 'active' : ''} onClick={() => setStep(index)}><span>{index + 1}</span>{label}<small>{index < step ? 'Complete' : index === step ? 'In progress' : 'Not started'}</small></button>)}<div className="editor-help"><ShieldCheck /><b>Listing checklist</b><span>Complete all required fields before submitting.</span></div></aside><section className="panel editor-panel"><div className="panel-heading"><div><h2>{sections[step]}</h2><p>Set the information customers need to understand your product.</p></div><StatusBadge tone="warning">{product?.status || 'DRAFT'}</StatusBadge></div>{error && <div className="auth-notice error" role="alert">{error}</div>}{notice && <div className="auth-notice success" role="status"><Check />{notice}</div>}{step === 0 && <div className="form-grid"><label><span>Product name<em>*</em></span><input value={form.name} onChange={(event) => update('name', event.target.value)} /></label><label><span>Category</span><select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">Choose category</option>{categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label className="wide"><span>Short description</span><input value={form.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} /></label><label className="wide"><span>Detailed description</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} /></label><label><span>Brand / collective</span><select value={form.brandId} onChange={(event) => update('brandId', event.target.value)}><option value="">Choose brand</option>{brands.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label><span>Tags</span><input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="handmade, Bengal" /></label></div>}{step === 1 && <div className="form-grid"><label><span>Variant SKU<em>*</em></span><input value={form.sku} onChange={(event) => update('sku', event.target.value)} /></label><label><span>Selling price<em>*</em></span><input type="number" min="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} /></label><label><span>Compare-at price</span><input type="number" min="0" value={form.compareAtPrice} onChange={(event) => update('compareAtPrice', event.target.value)} /></label><label><span>Available stock</span><input type="number" min="0" value={form.stock} onChange={(event) => update('stock', event.target.value)} /></label><label><span>GST included</span><input type="checkbox" checked={form.gstIncluded} onChange={(event) => update('gstIncluded', event.target.checked)} /></label>{additionalVariants.map((variant, index) => <div className="wide form-grid" key={index}><label><span>Additional SKU</span><input value={variant.sku} onChange={(event) => setAdditionalVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} /></label><label><span>Variant price</span><input type="number" min="0.01" value={variant.price} onChange={(event) => setAdditionalVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} /></label><label><span>Compare-at price</span><input type="number" min="0" value={variant.compareAtPrice} onChange={(event) => setAdditionalVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, compareAtPrice: event.target.value } : item))} /></label></div>)}<button type="button" className="secondary-button" onClick={() => setAdditionalVariants((current) => [...current, { sku: '', price: '', compareAtPrice: '' }])}>Add variant</button></div>}{step === 2 && <div className="form-grid"><label><span>Image URL</span><input type="url" value={form.imageUrl} onChange={(event) => update('imageUrl', event.target.value)} placeholder="https://..." /></label><label><span>Image storage key</span><input value={form.imageStorageKey} onChange={(event) => update('imageStorageKey', event.target.value)} /></label><label><span>Origin state</span><input value={form.originState} onChange={(event) => update('originState', event.target.value)} /></label><label><span>Dispatch days</span><input type="number" min="1" value={form.deliveryDays} onChange={(event) => update('deliveryDays', event.target.value)} /></label><div className="upload-box wide"><Package /><b>Product image metadata</b><span>The backend stores the URL and storage key. Upload processing is not available in the existing API.</span></div></div>}{step === 3 && <div className="preview-card"><div className="product-thumb terracotta">{form.name.slice(0, 2).toUpperCase() || 'PR'}</div><div><b>{form.name || 'Your product title'}</b><p>{form.shortDescription || 'Your customer-facing description will appear here.'}</p><strong>{form.price ? `₹${form.price}` : '₹0'}</strong></div></div>}<div className="editor-footer">{notice && <span className="save-message"><Check />{notice}</span>}<span className="editor-spacer" /><button className="secondary-button" disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : 'Save draft'}</button>{step < 3 ? <button className="primary-button" disabled={saving} onClick={() => setStep(step + 1)}>Save & continue <ChevronRight /></button> : <button className="primary-button" disabled={saving} onClick={() => save(true)}>{saving ? 'Submitting…' : 'Submit for review'} <Check /></button>}</div></section></div></>
}
