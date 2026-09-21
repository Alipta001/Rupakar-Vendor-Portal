'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MessageSquareText, Package, Star } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { api } from '@/api'

type ReviewListItem = {
  id?: string
  _id?: string
  customerId?: string
  customer?: {
    name?: string
    firstName?: string
    lastName?: string
  }
  customerName?: string
  productId?: string
  product?: {
    name?: string
    slug?: string
  }
  productName?: string
  orderId?: string
  vendorId?: string
  rating?: number
  title?: string
  comment?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

type ReviewListResponse = {
  items: ReviewListItem[]
  page: number
  limit: number
  total: number
}

const REVIEW_LIMIT = 10

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : 'Date unavailable'
const formatId = (value?: string) => value ? value.slice(-8).toUpperCase() : 'N/A'
const ratingStars = (rating = 0) => Array.from({ length: 5 }, (_, index) => index < Math.round(rating))

export default function ReviewsRoute() {
  const [reviews, setReviews] = useState<ReviewListItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    api.get<ReviewListResponse>(`/reviews/vendor?page=${page}&limit=${REVIEW_LIMIT}`)
      .then((result) => {
        if (!active) return
        setReviews(result.items ?? [])
        setTotal(result.total ?? 0)
      })
      .catch((cause) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Unable to load seller reviews')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page])

  const stats = useMemo(() => {
    const published = reviews.filter((review) => review.status !== 'HIDDEN' && review.status !== 'FLAGGED').length
    const average = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
      : 0

    return {
      published,
      average,
    }
  }, [reviews])

  const pageCount = Math.max(1, Math.ceil(total / REVIEW_LIMIT))

  return (
    <main className="workspace">
      <PageHeader
        eyebrow="Customer feedback"
        title="Reviews"
        description="See how shoppers rate your products and what they are saying."
      />

      <div className="metrics-grid">
        <MetricCard
          label="Average rating"
          value={reviews.length > 0 ? stats.average.toFixed(1) : '0.0'}
          change={reviews.length > 0 ? `${reviews.length} reviews loaded` : 'No reviews yet'}
          icon={Star}
        />
        <MetricCard
          label="Published"
          value={String(stats.published)}
          change="Visible reviews"
          icon={MessageSquareText}
          accent="green"
        />
        <MetricCard
          label="Total"
          value={String(total)}
          change="Across your catalog"
          icon={Package}
          accent="purple"
        />
      </div>

      {error && (
        <div className="auth-notice error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <section className="panel">
          <p className="subtle">Loading reviews…</p>
        </section>
      ) : reviews.length === 0 ? (
        <section className="panel empty-state">
          <h2>No reviews yet</h2>
          <p className="subtle">Reviews from customers who purchased your products will appear here.</p>
        </section>
      ) : (
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <h2>Customer reviews</h2>
              <p className="subtle">{total} review{total === 1 ? '' : 's'} from your store</p>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Product</th>
                  {reviews.some((review) => review.customerName || review.customer?.name || review.customer?.firstName) ? <th>Customer</th> : null}
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const reviewId = review.id || review._id || 'review'
                  const productName = review.productName || review.product?.name || 'Product unavailable'
                  const customerName = review.customerName || review.customer?.name || [review.customer?.firstName, review.customer?.lastName].filter(Boolean).join(' ') || null

                  return (
                    <tr key={reviewId}>
                      <td>
                        <div className="review-rating">
                          <span className="rating-stars" aria-label={`${review.rating || 0} out of 5 stars`}>
                            {ratingStars(review.rating || 0).map((filled, index) => (
                              <Star
                                key={`${reviewId}-star-${index}`}
                                size={14}
                                fill={filled ? 'currentColor' : 'none'}
                                className={filled ? 'star-filled' : 'star-empty'}
                              />
                            ))}
                          </span>
                          <small>{review.rating || 0}/5</small>
                        </div>
                      </td>
                      <td>
                        <b>{review.title || 'Review'}</b>
                        <p className="review-comment">{review.comment || 'No comment provided.'}</p>
                        <StatusBadge tone={review.status === 'PUBLISHED' ? 'success' : 'warning'}>
                          {review.status || 'PUBLISHED'}
                        </StatusBadge>
                      </td>
                      <td>
                        <b>{productName}</b>
                        <small>{review.productId ? `Product ID ${formatId(review.productId)}` : 'Product details unavailable'}</small>
                      </td>
                      {customerName ? (
                        <td>
                          <b>{customerName}</b>
                          <small>{review.customerId ? `Customer ID ${formatId(review.customerId)}` : 'Verified customer'}</small>
                        </td>
                      ) : null}
                      <td>
                        <b>{formatDate(review.createdAt)}</b>
                        <small>{review.orderId ? `Order ${formatId(review.orderId)}` : 'Order reference unavailable'}</small>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="pagination">
              <button
                className="secondary-button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft /> Previous
              </button>
              <span className="subtle">Page {page} of {pageCount}</span>
              <button
                className="secondary-button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page >= pageCount}
              >
                Next <ChevronRight />
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
