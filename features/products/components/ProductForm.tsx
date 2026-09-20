'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronRight, Loader2, Package, ShieldCheck, Trash2, X } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { productService, type LookupItem, type ProductImage, type ProductInput, type SellerProduct } from '@/features/products/services/product-service'
import type { View } from '@/features/seller/types/view.types'

type FormState = {
  name: string
  shortDescription: string
  description: string
  categoryId: string
  brandId: string
  tags: string
  sku: string
  price: string
  compareAtPrice: string
  stock: string
  originState: string
  deliveryDays: string
  gstIncluded: boolean
}

type AdditionalVariant = { sku: string; price: string; compareAtPrice: string }

const blank: FormState = {
  name: '',
  shortDescription: '',
  description: '',
  categoryId: '',
  brandId: '',
  tags: '',
  sku: '',
  price: '',
  compareAtPrice: '',
  stock: '0',
  originState: '',
  deliveryDays: '7',
  gstIncluded: false,
}

const sections = ['Basic information', 'Pricing & inventory', 'Shipping & authenticity', 'SEO & publish']

const normalizeImages = (images: SellerProduct['images'] | undefined): ProductImage[] => {
  if (!Array.isArray(images)) return []

  return images.flatMap((image) => {
    if (typeof image === 'string') return []
    const imageId = image?._id ?? image?.id
    if (!imageId && !image?.url) return []

    return [{
      ...image,
      _id: imageId ?? undefined,
      id: imageId ?? image?.id ?? image?.url,
      sortOrder: typeof image.sortOrder === 'number' ? image.sortOrder : 0,
      isPrimary: Boolean(image.isPrimary),
    }]
  })
}

const getImageId = (image: ProductImage) => image._id ?? image.id ?? image.url

const toForm = (product: SellerProduct): FormState => {
  const variant = product.variants?.[0]

  return {
    ...blank,
    name: product.name,
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    categoryId: typeof product.categoryId === 'string' ? product.categoryId : product.categoryId?._id || product.categoryId?.id || '',
    brandId: typeof product.brandId === 'string' ? product.brandId : product.brandId?._id || product.brandId?.id || '',
    tags: product.tags?.join(', ') || '',
    sku: variant?.sku || '',
    price: variant?.price ? String(variant.price) : '',
    compareAtPrice: variant?.compareAtPrice ? String(variant.compareAtPrice) : '',
    originState: '',
    deliveryDays: '7',
    gstIncluded: false,
  }
}

const getFriendlyError = (cause: unknown) => {
  if (cause instanceof Error) {
    const message = cause.message || 'Request failed'
    if (message.includes('Only JPG') || message.includes('image')) return 'Only JPG, PNG, WEBP, GIF, and BMP images up to 2 MB are allowed.'
    if (message.includes('20')) return 'A product can have up to 20 images.'
    return 'Unable to update product images. Please try again.'
  }

  return 'Unable to update product images. Please try again.'
}

export function ProductForm({ setView }: { setView: (view: View) => void }) {
  const params = useParams<{ productId?: string }>()
  const router = useRouter()
  const productId = params.productId
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState(blank)
  const [additionalVariants, setAdditionalVariants] = useState<AdditionalVariant[]>([])
  const [step, setStep] = useState(0)
  const [product, setProduct] = useState<SellerProduct>()
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [categories, setCategories] = useState<LookupItem[]>([])
  const [brands, setBrands] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(Boolean(productId))
  const [saving, setSaving] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [mutatingImageId, setMutatingImageId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [imageNotice, setImageNotice] = useState('')
  const [imageError, setImageError] = useState('')

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const refreshImages = async () => {
    if (!productId) {
      setProductImages([])
      return
    }

    setLoadingImages(true)
    try {
      const result = await productService.get(productId)
      setProduct(result)
      setProductImages(normalizeImages(result.images))
    } catch (cause) {
      setImageError(cause instanceof Error ? cause.message : 'Unable to load product images.')
    } finally {
      setLoadingImages(false)
    }
  }

  useEffect(() => {
    Promise.all([productService.categories(), productService.brands()])
      .then(([categoryResult, brandResult]) => {
        setCategories(categoryResult.items)
        setBrands(brandResult.items)
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Unable to load product options')
      })
  }, [])

  useEffect(() => {
    if (!productId) return

    productService.get(productId)
      .then((result) => {
        setProduct(result)
        setForm(toForm(result))
        setProductImages(normalizeImages(result.images))
        setAdditionalVariants(
          result.variants.slice(1).map((variant) => ({
            sku: variant.sku,
            price: String(variant.price),
            compareAtPrice: variant.compareAtPrice == null ? '' : String(variant.compareAtPrice),
          })),
        )
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Unable to load product')
      })
      .finally(() => setLoading(false))
  }, [productId])

  const sortedImages = [...productImages].sort((left, right) => {
    const leftOrder = left.sortOrder ?? 0
    const rightOrder = right.sortOrder ?? 0
    return leftOrder - rightOrder
  })

  const canUploadImages = Boolean(productId) && !uploadingImages && !loadingImages && !saving
  const uploadImagesDisabledReason = !productId
    ? 'Save the product before uploading images.'
    : uploadingImages
      ? 'Image upload is already in progress.'
      : loadingImages
        ? 'Images are still loading.'
        : saving
          ? 'Please wait for the product save to finish.'
          : ''

  const payload = (): ProductInput => ({
    name: form.name.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId || undefined,
    brandId: form.brandId || undefined,
    tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    variants: [
      {
        sku: form.sku.trim(),
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        status: 'ACTIVE' as const,
      },
      ...additionalVariants
        .filter((variant) => variant.sku.trim() && Number(variant.price))
        .map((variant) => ({
          sku: variant.sku.trim(),
          price: Number(variant.price),
          compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
          status: 'ACTIVE' as const,
        })),
    ],
    images: [],
    shipping: {
      originState: form.originState.trim() || undefined,
      deliveryDays: Number(form.deliveryDays) || undefined,
    },
    tax: { taxable: true, gstIncluded: form.gstIncluded },
  })

  const save = async (submit = false) => {
    setError('')
    setNotice('')
    setImageError('')

    if (!form.name.trim() || !form.sku.trim() || !Number(form.price)) {
      setError('Name, SKU, and a price greater than zero are required.')
      setStep(0)
      return
    }

    setSaving(true)
    try {
      const saved = productId ? await productService.update(productId, payload()) : await productService.create(payload())

      if (Number(form.stock) > 0 && saved.variants?.[0]) {
        await productService.adjustInventory(
          saved.variants[0]._id || saved.variants[0].id || '',
          Number(form.stock),
          'INITIAL_STOCK',
        )
      }

      if (submit) {
        await productService.submit(saved.id)
      }

      setProduct(saved)
      setNotice(submit ? 'Product submitted for review.' : 'Draft saved.')

      if (!productId) {
        router.replace(`/products/${saved.id}/edit`)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!productId) {
      setImageError('Save the product first before uploading images.')
      event.target.value = ''
      return
    }

    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!selectedFiles.length) return

    if (productImages.length + selectedFiles.length > 20) {
      setImageError('A product can have up to 20 images.')
      return
    }

    setUploadingImages(true)
    setImageError('')
    setImageNotice('')

    try {
      for (const [index, file] of selectedFiles.entries()) {
        const primaryImage = sortedImages.length === 0 && !sortedImages.some((image) => image.isPrimary)
        await productService.uploadImage(productId, file, {
          altText: file.name.replace(/\.[^/.]+$/, ''),
          sortOrder: sortedImages.length + index,
          isPrimary: primaryImage,
        })
      }

      setImageNotice('Images uploaded successfully.')
      await refreshImages()
    } catch (cause) {
      setImageError(getFriendlyError(cause))
    } finally {
      setUploadingImages(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!productId) return
    const image = sortedImages.find((entry) => getImageId(entry) === imageId)
    if (!image) return

    const confirmed = window.confirm(`Delete ${image.altText || 'this image'}?`)
    if (!confirmed) return

    setMutatingImageId(imageId)
    try {
      await productService.deleteImage(productId, imageId)
      await refreshImages()
      setImageNotice('Image deleted.')
    } catch (cause) {
      setImageError(getFriendlyError(cause))
    } finally {
      setMutatingImageId(null)
    }
  }

  const handleSetPrimary = async (imageId: string) => {
    if (!productId) return

    setMutatingImageId(imageId)
    try {
      await productService.updateImage(productId, imageId, { isPrimary: true })
      await refreshImages()
      setImageNotice('Primary image updated.')
    } catch (cause) {
      setImageError(getFriendlyError(cause))
    } finally {
      setMutatingImageId(null)
    }
  }

  const handleAltTextUpdate = async (imageId: string, altText: string) => {
    if (!productId) return

    setMutatingImageId(imageId)
    try {
      await productService.updateImage(productId, imageId, { altText: altText.trim() })
      setImageNotice('Image caption updated.')
    } catch (cause) {
      setImageError(getFriendlyError(cause))
    } finally {
      setMutatingImageId(null)
    }
  }

  const reorderImage = async (imageId: string, direction: 'up' | 'down') => {
    if (!productId) return

    const currentIndex = sortedImages.findIndex((image) => getImageId(image) === imageId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedImages.length) return

    const current = sortedImages[currentIndex]
    const next = sortedImages[targetIndex]

    setMutatingImageId(imageId)
    try {
      await productService.updateImage(productId, getImageId(current), {
        sortOrder: Number(next.sortOrder ?? targetIndex),
      })
      await productService.updateImage(productId, getImageId(next), {
        sortOrder: Number(current.sortOrder ?? currentIndex),
      })
      await refreshImages()
      setImageNotice('Image order updated.')
    } catch (cause) {
      setImageError(getFriendlyError(cause))
    } finally {
      setMutatingImageId(null)
    }
  }

  if (loading) return <main className="workspace"><p className="subtle">Loading product…</p></main>

  return (
    <>
      <PageHeader
        eyebrow={`Catalog / ${productId ? 'Edit product' : 'New product'}`}
        title={productId ? 'Edit product' : 'Add product'}
        description="Create a complete listing ready for review."
        action={
          <button
            className="secondary-button"
            onClick={() => {
              setView('products')
              router.push('/products')
            }}
          >
            <X />
            Cancel
          </button>
        }
      />

      <div className="product-editor">
        <aside className="editor-steps">
          {sections.map((label, index) => (
            <button key={label} className={step === index ? 'active' : ''} onClick={() => setStep(index)}>
              <span>{index + 1}</span>
              {label}
              <small>{index < step ? 'Complete' : index === step ? 'In progress' : 'Not started'}</small>
            </button>
          ))}

          <div className="editor-help">
            <ShieldCheck />
            <b>Listing checklist</b>
            <span>Complete all required fields before submitting.</span>
          </div>
        </aside>

        <section className="panel editor-panel product-form">
          <div className="panel-heading">
            <div>
              <h2>{sections[step]}</h2>
              <p>Set the information customers need to understand your product.</p>
            </div>
            <StatusBadge tone="warning">{product?.status || 'DRAFT'}</StatusBadge>
          </div>

          {error && (
            <div className="auth-notice error" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="auth-notice success" role="status">
              <Check />
              {notice}
            </div>
          )}

          {step === 0 && (
            <div className="form-grid">
              <div className="wide">
                <div className="upload-box" style={{ minHeight: '160px' }}>
                  <Package />
                  <b>Product images</b>
                  <span>
                    Upload up to 20 JPG, PNG, WEBP, GIF, or BMP images. The first uploaded image becomes the primary image.
                  </span>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        if (!canUploadImages) return
                        fileInputRef.current?.click()
                      }}
                      disabled={!canUploadImages}
                      title={uploadImagesDisabledReason || 'Choose image files'}
                      aria-label={uploadImagesDisabledReason || 'Choose image files'}
                    >
                      {uploadingImages ? <Loader2 className="spinner" /> : <Package />}
                      {uploadingImages ? 'Uploading…' : 'Choose images'}
                    </button>

                    {!productId && (
                      <span className="subtle" aria-live="polite">Save the product before uploading images.</span>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                    multiple
                    hidden
                    onChange={handleImageSelect}
                    disabled={!canUploadImages}
                    aria-label="Choose product images"
                  />
                </div>

                {imageError && (
                  <div className="auth-notice error" role="alert" style={{ marginTop: '12px' }}>
                    {imageError}
                  </div>
                )}

                {imageNotice && (
                  <div className="auth-notice success" role="status" style={{ marginTop: '12px' }}>
                    <Check />
                    {imageNotice}
                  </div>
                )}

                <div className="image-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '18px' }}>
                  {loadingImages ? (
                    <p className="subtle">Loading product images…</p>
                  ) : sortedImages.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                      No images uploaded yet.
                    </div>
                  ) : (
                    sortedImages.map((image) => {
                      const imageId = getImageId(image)
                      const isActive = imageId === mutatingImageId

                      return (
                        <div key={imageId} className="panel" style={{ padding: '10px' }}>
                          <div style={{ position: 'relative' }}>
                            <img
                              src={image.url}
                              alt={image.altText || 'Product image'}
                              style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }}
                            />
                            {image.isPrimary && (
                              <span className="badge" style={{ position: 'absolute', top: '8px', left: '8px' }}>
                                Primary
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleSetPrimary(imageId)}
                              disabled={isActive || image.isPrimary}
                            >
                              {isActive ? <Loader2 className="spinner" /> : null}
                              {image.isPrimary ? 'Current primary' : 'Set primary'}
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => reorderImage(imageId, 'up')}
                              disabled={isActive || !sortedImages.some((item) => getImageId(item) !== imageId)}
                              aria-label="Move earlier"
                            >
                              <ArrowUp />
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => reorderImage(imageId, 'down')}
                              disabled={isActive || !sortedImages.some((item) => getImageId(item) !== imageId)}
                              aria-label="Move later"
                            >
                              <ArrowDown />
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleDeleteImage(imageId)}
                              disabled={isActive}
                              aria-label="Delete image"
                            >
                              <Trash2 />
                            </button>
                          </div>

                          <label style={{ display: 'block', marginTop: '10px' }}>
                            <span className="subtle">Alt text</span>
                            <input
                              value={image.altText || ''}
                              onChange={(event) => {
                                const updated = sortedImages.map((item) => {
                                  const itemId = getImageId(item)
                                  return itemId === imageId ? { ...item, altText: event.target.value } : item
                                })
                                setProductImages(updated)
                              }}
                              onBlur={(event) => handleAltTextUpdate(imageId, event.target.value)}
                              placeholder="Image description"
                            />
                          </label>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <label>
                <span>Product name<em>*</em></span>
                <input value={form.name} onChange={(event) => update('name', event.target.value)} />
              </label>

              <label>
                <span>Category</span>
                <select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}>
                  <option value="">Choose category</option>
                  {categories.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Brand</span>
                <select value={form.brandId} onChange={(event) => update('brandId', event.target.value)}>
                  <option value="">Choose brand</option>
                  {brands.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="wide">
                <span>Short description</span>
                <input value={form.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} />
              </label>

              <label className="wide">
                <span>Detailed description</span>
                <textarea value={form.description} onChange={(event) => update('description', event.target.value)} />
              </label>

              <label>
                <span>Tags</span>
                <input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="organic, handcrafted" />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <label>
                <span>SKU<em>*</em></span>
                <input value={form.sku} onChange={(event) => update('sku', event.target.value)} />
              </label>

              <label>
                <span>Price<em>*</em></span>
                <input type="number" value={form.price} min="0" step="0.01" onChange={(event) => update('price', event.target.value)} />
              </label>

              <label>
                <span>Compare at price</span>
                <input type="number" value={form.compareAtPrice} min="0" step="0.01" onChange={(event) => update('compareAtPrice', event.target.value)} />
              </label>

              <label>
                <span>Inventory</span>
                <input type="number" value={form.stock} min="0" onChange={(event) => update('stock', event.target.value)} />
              </label>

              <div className="wide" style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setAdditionalVariants((current) => [...current, { sku: '', price: '', compareAtPrice: '' }])}
                  >
                    Add variant
                  </button>
                </div>

                {additionalVariants.map((variant, index) => (
                  <div key={`${variant.sku}-${index}`} className="field-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                    <label>
                      <span>Variant SKU</span>
                      <input value={variant.sku} onChange={(event) => setAdditionalVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} />
                    </label>
                    <label>
                      <span>Variant price</span>
                      <input type="number" value={variant.price} min="0" step="0.01" onChange={(event) => setAdditionalVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} />
                    </label>
                    <label>
                      <span>Compare at</span>
                      <input type="number" value={variant.compareAtPrice} min="0" step="0.01" onChange={(event) => setAdditionalVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, compareAtPrice: event.target.value } : item))} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <label>
                <span>Origin state</span>
                <input value={form.originState} onChange={(event) => update('originState', event.target.value)} />
              </label>

              <label>
                <span>Delivery days</span>
                <input type="number" value={form.deliveryDays} min="1" onChange={(event) => update('deliveryDays', event.target.value)} />
              </label>

              <label className="wide">
                <span>GST included</span>
                <input type="checkbox" checked={form.gstIncluded} onChange={(event) => update('gstIncluded', event.target.checked)} />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <label className="wide">
                <span>SEO title</span>
                <input value={form.name} onChange={(event) => update('name', event.target.value)} />
              </label>
            </div>
          )}

          <div className="action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
            >
              Previous
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => save(false)} disabled={saving}>
                {saving ? 'Saving…' : 'Save draft'}
              </button>

              {step < sections.length - 1 ? (
                <button type="button" className="primary-button" onClick={() => setStep((current) => Math.min(sections.length - 1, current + 1))}>
                  Continue
                  <ChevronRight />
                </button>
              ) : (
                <button type="button" className="primary-button" onClick={() => save(true)} disabled={saving}>
                  Submit for review
                  <Check />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
