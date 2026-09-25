'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Box, Check, ChevronLeft, ChevronRight, Package, Search } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { inventoryService, type InventoryItem, type InventoryStatus } from '@/features/inventory/services/inventory-service'
import type { View } from '@/features/seller/types/view.types'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/skeletons'

type Filter = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK'
const productName = (item: InventoryItem) => typeof item.productId === 'string' ? item.productId : item.productId.name
const sku = (item: InventoryItem) => typeof item.variantId === 'string' ? item.variantId : item.variantId.sku
const variantLabel = (item: InventoryItem) => typeof item.variantId === 'string' ? 'Variant' : Object.values(item.variantId.attributes || {}).join(' · ') || 'Standard'
const variantId = (item: InventoryItem) => typeof item.variantId === 'string' ? item.variantId : item.variantId._id
const isLow = (item: InventoryItem) => item.availableQuantity <= item.lowStockThreshold

export function InventoryPage({ setView: _setView }: { setView: (view: View) => void }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string>()
  const [success, setSuccess] = useState('')
  const [fetchKey, setFetchKey] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const limit = 20

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError('')
    setSuccess('')
    const status: InventoryStatus | undefined = filter === 'LOW_STOCK' ? 'LOW_STOCK' : undefined

    inventoryService.list({ page, limit, search, status }, { signal: controller.signal })
      .then((result) => {
        setItems(result.items)
        setTotal(result.total)
      })
      .catch((cause) => {
        if (cause?.name === 'CanceledError' || cause?.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Unable to load inventory')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [filter, page, search, fetchKey])

  const visibleItems = filter === 'OUT_OF_STOCK' ? items.filter((item) => item.availableQuantity === 0) : items
  const totalAvailable = items.reduce((sum, item) => sum + item.availableQuantity, 0)
  const lowCount = items.filter(isLow).length
  const outCount = items.filter((item) => item.availableQuantity === 0).length
  const pageCount = Math.max(1, Math.ceil(total / limit))

  const save = async (item: InventoryItem) => {
    const target = Number(editing[item._id])
    if (!Number.isInteger(target) || target < 0) {
      setError('Available stock must be a whole number greater than or equal to zero.')
      return
    }
    const delta = target - item.availableQuantity
    if (!delta) {
      setEditing((current) => {
        const next = { ...current }
        delete next[item._id]
        return next
      })
      return
    }
    setSaving(item._id)
    setError('')
    setSuccess('')
    try {
      await inventoryService.adjust(variantId(item), delta)
      setItems((current) =>
        current.map((currentItem) =>
          currentItem._id === item._id
            ? {
                ...currentItem,
                availableQuantity: target,
                status: target <= currentItem.lowStockThreshold ? 'LOW_STOCK' : 'ACTIVE',
              }
            : currentItem
        )
      )
      setEditing((current) => {
        const next = { ...current }
        delete next[item._id]
        return next
      })
      setSuccess(`${productName(item)} stock updated.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update inventory')
    } finally {
      setSaving(undefined)
    }
  }

  const isInitialLoading = loading && items.length === 0
  const isBackgroundFetching = loading && items.length > 0

  return (
    <>
      <PageHeader eyebrow="Operations" title="Inventory" description="Keep every SKU healthy and ready to ship." />
      <div className="metrics-grid">
        <MetricCard label="Available stock" value={String(totalAvailable)} change="Current page" icon={Box} />
        <MetricCard label="Low stock" value={String(lowCount)} change="Action needed" icon={AlertCircle} accent="purple" />
        <MetricCard label="Out of stock" value={String(outCount)} change="Review listing" icon={Package} accent="blue" />
      </div>

      <section className="panel table-panel">
        <div className="tabs inventory-tabs">
          <button className={filter === 'ALL' ? 'active' : ''} onClick={() => { setFilter('ALL'); setPage(1) }}>All stock</button>
          <button className={filter === 'LOW_STOCK' ? 'active' : ''} onClick={() => { setFilter('LOW_STOCK'); setPage(1) }}>Low stock</button>
          <button className={filter === 'OUT_OF_STOCK' ? 'active' : ''} onClick={() => { setFilter('OUT_OF_STOCK'); setPage(1) }}>Out of stock</button>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Search product or SKU..."
            />
          </div>
          {isBackgroundFetching && (
            <span className="text-xs text-[var(--seller-text-muted)] animate-pulse" style={{ alignSelf: 'center' }}>
              Updating inventory…
            </span>
          )}
        </div>

        {error && items.length > 0 && (
          <div className="auth-notice error" role="alert" style={{ margin: '1rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="auth-notice success" role="status" style={{ margin: '1rem' }}>
            <Check />
            {success}
          </div>
        )}

        {isInitialLoading ? (
          <div style={{ padding: '1rem' }}>
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : error && items.length === 0 ? (
          <ErrorState
            error={error}
            onRetry={() => {
              setError('')
              setFetchKey((k) => k + 1)
            }}
          />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="No inventory records found"
            description="Inventory is created automatically when a product variant is created."
            actionLabel={search || filter !== 'ALL' ? 'Clear filters' : undefined}
            onAction={
              search || filter !== 'ALL'
                ? () => {
                    setFilter('ALL')
                    setSearch('')
                    setPage(1)
                  }
                : undefined
            }
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product / SKU</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const value = editing[item._id] ?? String(item.availableQuantity)
                  const status = item.availableQuantity === 0 ? 'OUT OF STOCK' : isLow(item) ? 'LOW STOCK' : 'HEALTHY'
                  return (
                    <tr key={item._id}>
                      <td>
                        <b>{productName(item)}</b>
                        <small>{sku(item)} · {variantLabel(item)}</small>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={value}
                          disabled={saving === item._id}
                          onChange={(event) => setEditing((current) => ({ ...current, [item._id]: event.target.value }))}
                        />
                      </td>
                      <td>{item.reservedQuantity}</td>
                      <td>{item.lowStockThreshold}</td>
                      <td>
                        <StatusBadge tone={status === 'OUT OF STOCK' ? 'danger' : status === 'LOW STOCK' ? 'warning' : 'success'}>
                          {status}
                        </StatusBadge>
                      </td>
                      <td>
                        <button className="tiny-button" disabled={saving === item._id} onClick={() => save(item)}>
                          {saving === item._id ? 'Saving…' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-footer">
          <span>
            Showing <b>{visibleItems.length ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)}` : '0'}</b> of {total} records
          </span>
          <div>
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              <ChevronLeft />
            </button>
            <button className="current">{page}</button>
            <button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

