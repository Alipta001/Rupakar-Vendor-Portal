import { api } from '@/lib/api/client'

export type ProductStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED'

export type ProductVariant = {
  _id?: string
  id?: string
  sku: string
  barcode?: string
  price: number
  compareAtPrice?: number | null
  costPrice?: number | null
  weight?: number | null
  dimensions?: { length?: number; width?: number; height?: number }
  attributes?: Record<string, string>
  status?: 'ACTIVE' | 'INACTIVE'
}

export type ProductImage = {
  _id?: string
  id?: string
  productId?: string
  storageKey: string
  url: string
  altText?: string
  sortOrder?: number
  isPrimary?: boolean
  width?: number | null
  height?: number | null
  fileSize?: number | null
  mimeType?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
}

export type SellerProduct = {
  _id?: string
  id: string
  vendorId: string
  name: string
  slug: string
  shortDescription?: string
  description?: string
  categoryId?: { _id?: string; id?: string; name?: string } | string | null
  subcategoryId?: string | null
  brandId?: { _id?: string; id?: string; name?: string } | string | null
  tags: string[]
  variants: ProductVariant[]
  images: ProductImage[] | string[]
  status: ProductStatus
  rejectionReason?: string
  createdAt?: string
  updatedAt?: string
}

export type ProductInput = {
  name: string
  shortDescription?: string
  description?: string
  categoryId?: string
  subcategoryId?: string | null
  brandId?: string
  tags?: string[]
  variants?: ProductVariant[]
  images?: ProductImage[]
  shipping?: { originState?: string; originDistrict?: string; deliveryDays?: number; freeShipping?: boolean }
  tax?: { taxable?: boolean; taxCode?: string; gstIncluded?: boolean }
}

export type ProductPage = { data: SellerProduct[]; page: number; limit: number; total: number }
export type InventoryItem = { _id: string; productId: string; variantId: string; availableQuantity: number; reservedQuantity: number; soldQuantity: number; lowStockThreshold: number; status: string }
export type InventoryPage = { items: InventoryItem[]; page: number; limit: number; total: number }
export type LookupPage<T> = { items: T[]; page: number; limit: number; total: number }
export type LookupItem = { _id: string; id?: string; name: string; slug: string }

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)) })
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const productService = {
  list: (params: { page?: number; limit?: number; status?: ProductStatus; search?: string } = {}) => api.get<ProductPage>(`/vendor/products${query(params)}`),
  get: (id: string) => api.get<SellerProduct>(`/vendor/products/${id}`),
  create: (payload: ProductInput) => api.post<SellerProduct>('/vendor/products', payload),
  update: (id: string, payload: Partial<ProductInput> & { status?: ProductStatus }) => api.patch<SellerProduct>(`/vendor/products/${id}`, payload),
  submit: (id: string) => api.post<SellerProduct>(`/vendor/products/${id}/submit`, {}),
  uploadImage: (productId: string, file: File, metadata: { altText?: string; sortOrder?: number; isPrimary?: boolean } = {}) => {
    const formData = new FormData()
    formData.append('image', file)
    if (metadata.altText !== undefined) formData.append('altText', metadata.altText)
    if (metadata.sortOrder !== undefined) formData.append('sortOrder', String(metadata.sortOrder))
    if (metadata.isPrimary !== undefined) formData.append('isPrimary', String(metadata.isPrimary))
    return api.postMultipart<ProductImage>(`/vendor/products/${productId}/images`, formData)
  },
  deleteImage: (productId: string, imageId: string) => api.delete<{ deleted: boolean; imageId: string }>(`/vendor/products/${productId}/images/${imageId}`),
  updateImage: (productId: string, imageId: string, payload: { altText?: string; sortOrder?: number; isPrimary?: boolean }) => api.patch<ProductImage>(`/vendor/products/${productId}/images/${imageId}`, payload),
  inventory: (params: { page?: number; limit?: number } = {}) => api.get<InventoryPage>(`/vendor/inventory${query(params)}`),
  adjustInventory: (variantId: string, delta: number, reason = 'SELLER_ADJUSTMENT') => api.patch<InventoryItem>(`/vendor/inventory/${variantId}`, { delta, reason }),
  categories: () => api.get<LookupPage<LookupItem>>('/categories?limit=100'),
  brands: () => api.get<LookupPage<LookupItem>>('/brands?limit=100'),
}
