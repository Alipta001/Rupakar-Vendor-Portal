'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Filter, MoreHorizontal, Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { productService, type InventoryItem, type ProductStatus, type SellerProduct } from '@/features/products/services/product-service'
import { statusLabel, statusTone } from '@/features/seller/types/seller.types'
import type { View } from '@/features/seller/types/view.types'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/skeletons'

const statuses: Array<{ label: string; value?: ProductStatus }> = [{ label: 'All products' }, { label: 'Published', value: 'PUBLISHED' }, { label: 'Under review', value: 'UNDER_REVIEW' }, { label: 'Drafts', value: 'DRAFT' }, { label: 'Rejected', value: 'REJECTED' }]

const productPrice = (product: SellerProduct) => product.variants?.[0]?.price ?? 0
const productStock = (product: SellerProduct, inventory: InventoryItem[]) => {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, variant) => {
      const vId = String(variant._id || variant.id || '')
      const match = inventory.find((item) => {
        const itemVId = typeof item.variantId === 'object' && item.variantId !== null
          ? String(item.variantId._id || item.variantId.id || '')
          : String(item.variantId || '')
        return itemVId === vId
      })
      const available = match
        ? match.availableQuantity
        : typeof variant.availableStock === 'number'
        ? variant.availableStock
        : typeof variant.stock === 'number'
        ? variant.stock
        : 0
      return sum + available
    }, 0)
  }
  return typeof product.availableStock === 'number'
    ? product.availableStock
    : typeof product.stock === 'number'
    ? product.stock
    : 0
}

const productSku = (product: SellerProduct) => product.variants?.[0]?.sku ?? 'No SKU'

export function ProductsPage({ setView }: { setView: (view: View) => void }) {
  const router = useRouter()
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [status, setStatus] = useState<ProductStatus>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rawError, setRawError] = useState<unknown>(null)
  const limit = 20

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    setRawError(null)
    Promise.all([
      productService.list({ page, limit, status, search }, { signal }),
      productService.inventory({ limit: 100 }, { signal }),
    ])
      .then(([result, inventoryResult]) => {
        setProducts(result.data)
        setTotal(result.total)
        setInventory(inventoryResult.items)
      })
      .catch((cause) => {
        if (cause?.name === 'CanceledError' || cause?.code === 'ERR_CANCELED') return
        setRawError(cause)
        setError(cause instanceof Error ? cause.message : 'Unable to load products')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [page, limit, status, search])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const openNew = () => { setView('product-new'); router.push('/products/new') }
  const openProduct = (id: string) => { setView('product-detail'); router.push(`/products/${id}`) }
  const pageCount = Math.max(1, Math.ceil(total / limit))

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Manage your catalog, pricing, and approval status."
        action={<button className="primary-button" onClick={openNew}><Plus /> Add product</button>}
      />
      <div className="tabs">
        {statuses.map((item) => (
          <button
            key={item.label}
            className={status === item.value ? 'active' : !status && !item.value ? 'active' : ''}
            onClick={() => { setStatus(item.value); setPage(1) }}
          >
            {item.label} {item.value && <span>{item.value === status ? total : ''}</span>}
          </button>
        ))}
      </div>
      <section className="panel table-panel product-table">
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Search products, SKU..."
            />
          </div>
          <button className="filter-button"><Filter /> Filters</button>
          <button className="secondary-button" onClick={openNew}><Plus /> New product</button>
        </div>

        {loading && products.length === 0 ? (
          <TableSkeleton columns={6} rows={6} />
        ) : error && products.length === 0 ? (
          <ErrorState error={rawError || error} onRetry={() => load()} />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Create your first product to start building your catalog."
            actionLabel="Add product"
            onAction={openNew}
          />
        ) : (
          <div className="table-scroll" style={{ opacity: loading ? 0.65 : 1, transition: 'opacity 0.2s' }}>
            <table>
              <thead>
                <tr>
                  <th className="check"><input type="checkbox" /></th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} onClick={() => openProduct(product.id)}>
                    <td className="check">
                      <input type="checkbox" onClick={(event) => event.stopPropagation()} />
                    </td>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb terracotta">{product.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <b>{product.name}</b>
                          <small>{productSku(product)}</small>
                        </div>
                      </div>
                    </td>
                    <td>{typeof product.categoryId === 'object' ? product.categoryId?.name : product.categoryId || 'Uncategorized'}</td>
                    <td><b>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(productPrice(product))}</b></td>
                    <td><span>{productStock(product, inventory)} units</span></td>
                    <td><StatusBadge tone={statusTone(product.status)}>{statusLabel(product.status)}</StatusBadge></td>
                    <td>
                      <button className="row-more" onClick={(event) => { event.stopPropagation(); openProduct(product.id) }}>
                        <MoreHorizontal />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-footer">
          <span>
            Showing <b>{products.length ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)}` : '0'}</b> of {total} products
            {loading && products.length > 0 && <span style={{ marginLeft: '8px', color: 'var(--muted)' }}>(updating…)</span>}
          </span>
          <div>
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button>
            <button className="current">{page}</button>
            <button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button>
          </div>
        </div>
      </section>
    </>
  )
}
