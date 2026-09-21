'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Info,
  Loader2,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  productService,
  type LookupItem,
  type ProductImage,
  type ProductInput,
  type SellerProduct,
} from '@/features/products/services/product-service'
import { ApiError, getApiErrorMessage } from '@/lib/api/errors'
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

const sections = [
  'Basic information',
  'Pricing & inventory',
  'Shipping & authenticity',
  'SEO & publish',
]

const stepDescriptions = [
  'Upload product images, select categories, and craft compelling descriptions.',
  'Set base SKU, selling price, discounts, and warehouse inventory stock.',
  'Define fulfillment timelines, dispatch origin state, and tax inclusion.',
  'Optimize listing metadata for search engines and submit for marketplace review.',
]

const normalizeImages = (images: SellerProduct['images'] | undefined): ProductImage[] => {
  if (!Array.isArray(images)) return []

  return images.flatMap((image) => {
    if (typeof image === 'string') return []
    const imageId = image?._id ?? image?.id
    if (!imageId && !image?.url) return []

    return [
      {
        ...image,
        _id: imageId ?? undefined,
        id: imageId ?? image?.id ?? image?.url,
        sortOrder: typeof image.sortOrder === 'number' ? image.sortOrder : 0,
        isPrimary: Boolean(image.isPrimary),
      },
    ]
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
    categoryId:
      typeof product.categoryId === 'string'
        ? product.categoryId
        : product.categoryId?._id || product.categoryId?.id || '',
    brandId:
      typeof product.brandId === 'string'
        ? product.brandId
        : product.brandId?._id || product.brandId?.id || '',
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
  if (cause instanceof ApiError) {
    if (process.env.NODE_ENV !== 'production') {
      const status = cause.status || 'network'
      const code = cause.code ? ` ${cause.code}` : ''
      return `Image upload failed (${status}${code}): ${cause.message}`
    }

    if (cause.status >= 500) {
      return 'Image storage is temporarily unavailable. Please try again later.'
    }

    return getApiErrorMessage(cause, 'Unable to update product images. Please try again.')
  }

  if (cause instanceof Error) {
    const message = cause.message || 'Request failed'
    if (process.env.NODE_ENV !== 'production') return `Image upload failed: ${message}`
    if (message.includes('Only JPG') || message.includes('image')) {
      return 'Only JPG, PNG, WEBP, GIF, and BMP images up to 2 MB are allowed.'
    }
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

    productService
      .get(productId)
      .then((result) => {
        setProduct(result)
        setForm(toForm(result))
        setProductImages(normalizeImages(result.images))
        setAdditionalVariants(
          result.variants.slice(1).map((variant) => ({
            sku: variant.sku || '',
            price: String(variant.price),
            compareAtPrice:
              variant.compareAtPrice == null ? '' : String(variant.compareAtPrice),
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
    ? 'Save the product draft first to enable image uploads.'
    : uploadingImages
      ? 'Image upload is currently in progress.'
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
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    variants: [
      {
        ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        status: 'ACTIVE' as const,
      },
      ...additionalVariants
        .filter((variant) => Number(variant.price))
        .map((variant) => ({
          ...(variant.sku.trim() ? { sku: variant.sku.trim() } : {}),
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

    if (!form.name.trim() || !Number(form.price)) {
      setError('Product name and a selling price greater than ₹0 are required.')
      setStep(0)
      return
    }

    setSaving(true)
    try {
      const saved = productId
        ? await productService.update(productId, payload())
        : await productService.create(payload())

      const savedVariantId = saved.variantId || saved.variants?.[0]?._id || saved.variants?.[0]?.id
      if (Number(form.stock) > 0 && savedVariantId) {
        await productService.adjustInventory(
          savedVariantId,
          Number(form.stock),
          'INITIAL_STOCK',
        )
      } else if (Number(form.stock) > 0) {
        throw new Error('The product was created, but its variant ID was not returned. Inventory was not updated.')
      }

      if (submit) {
        await productService.submit(saved.id)
      }

      setProduct(saved)
      setForm(toForm(saved))
      setNotice(
        submit
          ? 'Product submitted for marketplace review.'
          : 'Product draft saved successfully.',
      )

      if (!productId) {
        router.replace(`/products/${saved.id}/edit`)
      }
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to save product'))
    } finally {
      setSaving(false)
    }
  }

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!productId) {
      setImageError('Save the product draft first before uploading images.')
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
        const primaryImage =
          sortedImages.length === 0 && index === 0 && !sortedImages.some((image) => image.isPrimary)
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

  if (loading) {
    return (
      <main className="workspace">
        <p className="subtle">Loading product information…</p>
      </main>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={`Catalog / ${productId ? 'Edit product' : 'New product'}`}
        title={productId ? 'Edit product' : 'Add product'}
        description="Create a comprehensive listing ready for customer discovery and marketplace review."
        action={
          <button
            type="button"
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
        {/* Step Navigation Sidebar */}
        <aside className="editor-steps">
          <div className="editor-steps-header">
            <h3>Listing Workflow</h3>
            <p>Step {step + 1} of {sections.length}</p>
          </div>

          {sections.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`${step === index ? 'active' : ''} ${index < step ? 'completed' : ''}`}
              onClick={() => setStep(index)}
            >
              <span className="step-num">
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </span>
              <div className="step-info">
                <span className="step-title">{label}</span>
                <small className="step-status">
                  {index < step ? 'Completed' : index === step ? 'In progress' : 'Upcoming'}
                </small>
              </div>
              <ChevronRight className="step-arrow" />
            </button>
          ))}

          <div className="editor-help">
            <ShieldCheck />
            <div>
              <b>Listing Checklist</b>
              <span>
                Required fields are marked with an asterisk (<em>*</em>). Ensure clear imagery and accurate craft details.
              </span>
            </div>
          </div>
        </aside>

        {/* Main Form Content */}
        <section className="panel product-form">
          <div className="panel-heading">
            <div>
              <h2>{sections[step]}</h2>
              <p>{stepDescriptions[step]}</p>
            </div>
            <StatusBadge tone="warning">{product?.status || 'DRAFT'}</StatusBadge>
          </div>

          {error && (
            <div className="auth-notice error" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="auth-notice success" role="status">
              <Check className="w-5 h-5 flex-shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Step 0: Basic Information */}
          {step === 0 && (
            <div>
              {/* Product Images Section */}
              <div className="form-card">
                <div className="form-card-header">
                  <Package className="w-5 h-5 text-[#d76437]" />
                  <div>
                    <h3 className="form-card-title">Product Imagery</h3>
                    <p className="form-card-subtitle">
                      Visual presentation of your craft for customer catalog exploration.
                    </p>
                  </div>
                </div>

                <div className="upload-box">
                  <div>
                    <b>Upload Product Images</b>
                    <span>
                      Support for JPG, PNG, WEBP, GIF, and BMP formats up to 2 MB each. You can add up to 20 images. The first image is set as the primary catalog showcase.
                    </span>
                  </div>

                  {!productId && (
                    <div className="upload-draft-notice">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Save your product draft first to generate a listing ID and unlock image uploads.
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                      {uploadingImages ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Package className="w-4 h-4" />
                      )}
                      <span>{uploadingImages ? 'Uploading images…' : 'Choose images'}</span>
                    </button>

                    {!productId && (
                      <span className="field-hint">
                        Disabled until draft is saved
                      </span>
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
                  <div className="auth-notice error" role="alert" style={{ marginTop: '14px' }}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{imageError}</span>
                  </div>
                )}

                {imageNotice && (
                  <div className="auth-notice success" role="status" style={{ marginTop: '14px' }}>
                    <Check className="w-5 h-5 flex-shrink-0" />
                    <span>{imageNotice}</span>
                  </div>
                )}

                {/* Uploaded Image Previews */}
                <div className="image-grid">
                  {loadingImages ? (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading existing images…
                    </div>
                  ) : sortedImages.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                      No product images uploaded yet. Save the draft to begin uploading.
                    </div>
                  ) : (
                    sortedImages.map((image) => {
                      const imageId = getImageId(image)
                      const isActive = imageId === mutatingImageId

                      return (
                        <div key={imageId} className="image-card">
                          <div className="image-card-thumb">
                            <img
                              src={image.url}
                              alt={image.altText || 'Product image preview'}
                            />
                            {image.isPrimary && (
                              <span
                                className="badge"
                                style={{ position: 'absolute', top: '8px', left: '8px' }}
                              >
                                Primary
                              </span>
                            )}
                          </div>

                          <div className="image-card-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleSetPrimary(imageId)}
                              disabled={isActive || image.isPrimary}
                            >
                              {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                              {image.isPrimary ? 'Primary' : 'Set primary'}
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => reorderImage(imageId, 'up')}
                              disabled={isActive}
                              aria-label="Move earlier"
                              title="Move image earlier"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => reorderImage(imageId, 'down')}
                              disabled={isActive}
                              aria-label="Move later"
                              title="Move image later"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleDeleteImage(imageId)}
                              disabled={isActive}
                              aria-label="Delete image"
                              title="Delete image"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </button>
                          </div>

                          <div className="form-field" style={{ marginTop: '4px' }}>
                            <label>
                              <span style={{ fontSize: '11px', color: '#71717a' }}>Alt text</span>
                              <input
                                style={{ minHeight: '36px', fontSize: '12px', padding: '6px 10px' }}
                                value={image.altText || ''}
                                onChange={(event) => {
                                  const updated = sortedImages.map((item) => {
                                    const itemId = getImageId(item)
                                    return itemId === imageId
                                      ? { ...item, altText: event.target.value }
                                      : item
                                  })
                                  setProductImages(updated)
                                }}
                                onBlur={(event) =>
                                  handleAltTextUpdate(imageId, event.target.value)
                                }
                                placeholder="Describe this photo for accessibility"
                              />
                            </label>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Categorization & Brand Card */}
              <div className="form-card">
                <div className="form-card-header">
                  <Sparkles className="w-5 h-5 text-[#d76437]" />
                  <div>
                    <h3 className="form-card-title">Category & Brand Classification</h3>
                    <p className="form-card-subtitle">
                      Help buyers discover your product in the correct marketplace taxonomy.
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>
                      <span>Category<em>*</em></span>
                      <select
                        value={form.categoryId}
                        onChange={(event) => update('categoryId', event.target.value)}
                      >
                        <option value="">Select a category</option>
                        {categories.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="field-hint">Primary collection placement</span>
                  </div>

                  <div className="form-field">
                    <label>
                      <span>Brand / Studio<em>*</em></span>
                      <select
                        value={form.brandId}
                        onChange={(event) => update('brandId', event.target.value)}
                      >
                        <option value="">Select a brand / artisan studio</option>
                        {brands.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="field-hint">Artisan guild or workshop imprint</span>
                  </div>
                </div>
              </div>

              {/* Title & Description Card */}
              <div className="form-card">
                <div className="form-card-header">
                  <Info className="w-5 h-5 text-[#d76437]" />
                  <div>
                    <h3 className="form-card-title">Product Details</h3>
                    <p className="form-card-subtitle">
                      Detailed information explaining the craft, materials, and artisan story.
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field wide">
                    <label>
                      <span>Product Title<em>*</em></span>
                      <input
                        value={form.name}
                        onChange={(event) => update('name', event.target.value)}
                        placeholder="e.g. Hand-painted Terracotta Horse from Bishnupur"
                      />
                    </label>
                    <span className="field-hint">
                      Include distinguishing features such as craft style, region, or primary material.
                    </span>
                  </div>

                  <div className="form-field wide">
                    <label>
                      <span>Short Description</span>
                      <input
                        value={form.shortDescription}
                        onChange={(event) => update('shortDescription', event.target.value)}
                        placeholder="e.g. Traditional handmade Bengali terracotta folk art sculpture"
                      />
                    </label>
                    <span className="field-hint">
                      A concise summary displayed on search cards and quick views.
                    </span>
                  </div>

                  <div className="form-field wide">
                    <label>
                      <span>Detailed Description</span>
                      <textarea
                        value={form.description}
                        onChange={(event) => update('description', event.target.value)}
                        placeholder="Describe the heritage craftsmanship, artisan technique, dimensions, materials, care instructions, and authenticity notes…"
                      />
                    </label>
                    <span className="field-hint">
                      Thoroughly detail dimensions, weight, materials, and traditional methods.
                    </span>
                  </div>

                  <div className="form-field wide">
                    <label>
                      <span>Keywords & Tags</span>
                      <input
                        value={form.tags}
                        onChange={(event) => update('tags', event.target.value)}
                        placeholder="terracotta, handcrafted, bishnupur, clay art, folk heritage"
                      />
                    </label>
                    <span className="field-hint">
                      Comma-separated keywords to improve buyer search discovery.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Pricing & Inventory */}
          {step === 1 && (
            <div>
              <div className="form-card">
                <div className="form-card-header">
                  <Sparkles className="w-5 h-5 text-[#d76437]" />
                  <div>
                    <h3 className="form-card-title">Base SKU & Pricing</h3>
                    <p className="form-card-subtitle">
                      Manage item valuation, retail pricing, and studio inventory count.
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>
                      <span>SKU Code (Auto-generated)</span>
                      <input
                        value={form.sku}
                        onChange={(event) => update('sku', event.target.value)}
                        placeholder="e.g. RUP-TER-024"
                      />
                    </label>
                    <span className="field-hint">Leave blank to generate a unique SKU automatically. You can edit it before saving.</span>
                  </div>

                  <div className="form-field">
                    <label>
                      <span>Selling Price (₹)<em>*</em></span>
                      <input
                        type="number"
                        value={form.price}
                        min="0"
                        step="0.01"
                        onChange={(event) => update('price', event.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <span className="field-hint">Final customer purchase price</span>
                  </div>

                  <div className="form-field">
                    <label>
                      <span>Compare-at Price (₹)</span>
                      <input
                        type="number"
                        value={form.compareAtPrice}
                        min="0"
                        step="0.01"
                        onChange={(event) => update('compareAtPrice', event.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <span className="field-hint">Original MRP to display crossed-out discount</span>
                  </div>

                  <div className="form-field">
                    <label>
                      <span>Available Stock Units</span>
                      <input
                        type="number"
                        value={form.stock}
                        min="0"
                        onChange={(event) => update('stock', event.target.value)}
                        placeholder="0"
                      />
                    </label>
                    <span className="field-hint">Immediate available physical inventory</span>
                  </div>
                </div>
              </div>

              {/* Additional Variants Card */}
              <div className="form-card">
                <div className="form-card-header">
                  <Package className="w-5 h-5 text-[#d76437]" />
                  <div style={{ flex: 1 }}>
                    <h3 className="form-card-title">Product Variants</h3>
                    <p className="form-card-subtitle">
                      Add size, dimension, or color iterations of this craft.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setAdditionalVariants((current) => [
                        ...current,
                        { sku: '', price: '', compareAtPrice: '' },
                      ])
                    }
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Variant</span>
                  </button>
                </div>

                {additionalVariants.length === 0 ? (
                  <div className="empty-state">
                    No additional variants configured. This listing sells as a single standard unit.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {additionalVariants.map((variant, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) 46px',
                          gap: '12px',
                          alignItems: 'flex-end',
                          padding: '14px',
                          borderRadius: '10px',
                          background: '#fcfbf9',
                          border: '1px solid #e8e2da',
                        }}
                      >
                        <div className="form-field">
                          <label>
                            <span>Variant SKU</span>
                            <input
                              value={variant.sku}
                              onChange={(event) =>
                                setAdditionalVariants((current) =>
                                  current.map((item, i) =>
                                    i === index ? { ...item, sku: event.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="e.g. RUP-TER-024-XL"
                            />
                          </label>
                        </div>

                        <div className="form-field">
                          <label>
                            <span>Price (₹)</span>
                            <input
                              type="number"
                              value={variant.price}
                              min="0"
                              step="0.01"
                              onChange={(event) =>
                                setAdditionalVariants((current) =>
                                  current.map((item, i) =>
                                    i === index ? { ...item, price: event.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="0.00"
                            />
                          </label>
                        </div>

                        <div className="form-field">
                          <label>
                            <span>Compare-at (₹)</span>
                            <input
                              type="number"
                              value={variant.compareAtPrice}
                              min="0"
                              step="0.01"
                              onChange={(event) =>
                                setAdditionalVariants((current) =>
                                  current.map((item, i) =>
                                    i === index
                                      ? { ...item, compareAtPrice: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="0.00"
                            />
                          </label>
                        </div>

                        <button
                          type="button"
                          className="secondary-button"
                          style={{ minHeight: '46px', padding: '0', display: 'grid', placeItems: 'center' }}
                          onClick={() =>
                            setAdditionalVariants((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                          aria-label="Remove variant"
                          title="Remove variant"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Shipping & Authenticity */}
          {step === 2 && (
            <div>
              <div className="form-card">
                <div className="form-card-header">
                  <Package className="w-5 h-5 text-[#d76437]" />
                  <div>
                    <h3 className="form-card-title">Fulfillment & Logistics</h3>
                    <p className="form-card-subtitle">
                      Set accurate dispatch estimates and regional origin for logistics calculation.
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>
                      <span>Craft Origin State</span>
                      <input
                        value={form.originState}
                        onChange={(event) => update('originState', event.target.value)}
                        placeholder="e.g. West Bengal, Odisha, Rajasthan"
                      />
                    </label>
                    <span className="field-hint">State where the artisan workshop resides</span>
                  </div>

                  <div className="form-field">
                    <label>
                      <span>Estimated Delivery Days</span>
                      <input
                        type="number"
                        value={form.deliveryDays}
                        min="1"
                        onChange={(event) => update('deliveryDays', event.target.value)}
                        placeholder="7"
                      />
                    </label>
                    <span className="field-hint">Standard shipping duration to all-India destinations</span>
                  </div>

                  <div className="form-field wide">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e4e0d8',
                        background: '#fdfcf9',
                      }}
                    >
                      <input
                        type="checkbox"
                        id="gst-included-checkbox"
                        checked={form.gstIncluded}
                        onChange={(event) => update('gstIncluded', event.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#d76437' }}
                      />
                      <label
                        htmlFor="gst-included-checkbox"
                        style={{ display: 'flex', flexDirection: 'column', gap: '2px', cursor: 'pointer' }}
                      >
                        <span style={{ fontWeight: 600, color: '#18181b', fontSize: '13px' }}>
                          Goods and Services Tax (GST) included in selling price
                        </span>
                        <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 400 }}>
                          When enabled, buyers see net pricing with all applicable craft taxes inclusive.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Authenticity Pledge Card */}
              <div className="form-card">
                <div className="form-card-header">
                  <ShieldCheck className="w-5 h-5 text-[#2e7d52]" />
                  <div>
                    <h3 className="form-card-title">Rupakar Authenticity Guarantee</h3>
                    <p className="form-card-subtitle">
                      Marketplace verification criteria for handmade and artisan certified goods.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: '#f4faf6',
                    border: '1px solid #cce8d7',
                    color: '#1e5436',
                    fontSize: '13px',
                    lineHeight: '1.6',
                  }}
                >
                  <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Artisan Quality Standards:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>100% genuine artisan craftsmanship using verified regional methods.</li>
                    <li>Accurate material representations (e.g. genuine terracotta, pure silk, hand-cast brass).</li>
                    <li>Direct support for Indian heritage clusters and craft preservation.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: SEO & Publish */}
          {step === 3 && (
            <div>
              <div className="form-card">
                <div className="form-card-header">
                  <Sparkles className="w-5 h-5 text-[#d76437]" />
                  <div>
                    <h3 className="form-card-title">Search Engine Optimization</h3>
                    <p className="form-card-subtitle">
                      Preview how your craft listing appears in Google and search engine rankings.
                    </p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field wide">
                    <label>
                      <span>SEO Page Title</span>
                      <input
                        value={form.name}
                        onChange={(event) => update('name', event.target.value)}
                        placeholder="Search engine optimized listing title"
                      />
                    </label>
                    <span className="field-hint">
                      Recommended 50–60 characters for optimal search snippet display.
                    </span>
                  </div>

                  {/* Search Engine Snippet Preview */}
                  <div className="wide">
                    <p style={{ margin: '8px 0 6px', fontSize: '12px', fontWeight: 600, color: '#52525b' }}>
                      Search Result Preview:
                    </p>
                    <div
                      style={{
                        padding: '16px 18px',
                        borderRadius: '10px',
                        border: '1px solid #e2ded8',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '12px', color: '#166534' }}>
                        https://rupakar.in › catalog › products › {form.sku || 'listing'}
                      </p>
                      <h4
                        style={{
                          margin: '4px 0',
                          fontSize: '17px',
                          fontWeight: 600,
                          color: '#1e40af',
                          lineHeight: '1.3',
                        }}
                      >
                        {form.name || 'Handcrafted Product Title'} · Rupakar Seller Studio
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: '1.45' }}>
                        {form.shortDescription ||
                          form.description?.slice(0, 150) ||
                          'Authentic handcrafted art and heritage craft directly from master artisans across India on Rupakar.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ready to Submit Confirmation Card */}
              <div className="form-card">
                <div className="form-card-header">
                  <Check className="w-5 h-5 text-[#2e7d52]" />
                  <div>
                    <h3 className="form-card-title">Pre-submission Review</h3>
                    <p className="form-card-subtitle">
                      Verify key listing requirements before submitting to the curation team.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: form.name.trim() ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${form.name.trim() ? '#bbf7d0' : '#fecaca'}`,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: form.name.trim() ? '#166534' : '#991b1b',
                    }}
                  >
                    {form.name.trim() ? '✓ Product title provided' : '✗ Product title required'}
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: form.sku.trim() ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${form.sku.trim() ? '#bbf7d0' : '#fecaca'}`,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: form.sku.trim() ? '#166534' : '#991b1b',
                    }}
                  >
                    {form.sku.trim() ? '✓ SKU configured' : '✓ SKU will be generated automatically'}
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: Number(form.price) > 0 ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${Number(form.price) > 0 ? '#bbf7d0' : '#fecaca'}`,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: Number(form.price) > 0 ? '#166534' : '#991b1b',
                    }}
                  >
                    {Number(form.price) > 0
                      ? `✓ Price: ₹${Number(form.price).toLocaleString('en-IN')}`
                      : '✗ Price must be > ₹0'}
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: productImages.length > 0 ? '#f0fdf4' : '#fffbeb',
                      border: `1px solid ${productImages.length > 0 ? '#bbf7d0' : '#fef3c7'}`,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: productImages.length > 0 ? '#166534' : '#92400e',
                    }}
                  >
                    {productImages.length > 0
                      ? `✓ ${productImages.length} images attached`
                      : 'ℹ Images can be uploaded after saving draft'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="action-row">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
            >
              Previous
            </button>

            <div className="action-group">
              <button
                type="button"
                className="secondary-button"
                onClick={() => save(false)}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving draft…</span>
                  </>
                ) : (
                  <span>Save draft</span>
                )}
              </button>

              {step < sections.length - 1 ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setStep((current) => Math.min(sections.length - 1, current + 1))}
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => save(true)}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    <>
                      <span>Submit for review</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
