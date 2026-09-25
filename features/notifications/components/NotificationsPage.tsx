'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Check, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { notificationService, type NotificationItem } from '@/features/notifications/services/notification-service'
import { statusLabel } from '@/features/seller/types/seller.types'
import { Skeleton, EmptyState, ErrorState } from '@/components/skeletons'

const date = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : 'Date unavailable'

function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="panel notification-list" aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: count }).map((_, index) => (
        <div className="notification-row" key={index} style={{ alignItems: 'flex-start', padding: '1rem' }}>
          <Skeleton className="w-10 h-10 rounded-full" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      ))}
    </section>
  )
}

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState<string>()
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

    Promise.all([
      notificationService.list(page, limit, unreadOnly, { signal: controller.signal }),
      notificationService.unreadCount({ signal: controller.signal }),
    ])
      .then(([result, count]) => {
        setItems(result.items)
        setTotal(result.total)
        setUnreadCount(count.unreadCount)
      })
      .catch((cause) => {
        if (cause?.name === 'CanceledError' || cause?.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Unable to load notifications')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [page, unreadOnly, fetchKey])

  const markRead = async (item: NotificationItem) => {
    if (item.readAt) return
    setAction(item._id)
    setError('')
    try {
      await notificationService.markRead(item._id)
      setItems((current) =>
        current.map((entry) => (entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry))
      )
      setUnreadCount((count) => Math.max(0, count - 1))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark notification as read')
    } finally {
      setAction(undefined)
    }
  }

  const markAllRead = async () => {
    setAction('all')
    setError('')
    try {
      await notificationService.markAllRead()
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
      setUnreadCount(0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark notifications as read')
    } finally {
      setAction(undefined)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / limit))
  const isInitialLoading = loading && items.length === 0
  const isBackgroundFetching = loading && items.length > 0

  return (
    <main className="workspace">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Stay on top of orders, products, finance, and important seller updates."
        action={
          <button
            className="secondary-button"
            disabled={action === 'all' || unreadCount === 0}
            onClick={markAllRead}
          >
            <Check /> Mark all read
          </button>
        }
      />

      <div className="notification-filters">
        <button
          className={!unreadOnly ? 'active' : ''}
          onClick={() => {
            setUnreadOnly(false)
            setPage(1)
          }}
        >
          All
        </button>
        <button
          className={unreadOnly ? 'active' : ''}
          onClick={() => {
            setUnreadOnly(true)
            setPage(1)
          }}
        >
          Unread <span>{unreadCount}</span>
        </button>
        {isBackgroundFetching && (
          <span className="text-xs text-[var(--seller-text-muted)] animate-pulse" style={{ alignSelf: 'center', marginLeft: 'auto' }}>
            Updating notifications…
          </span>
        )}
      </div>

      {error && items.length > 0 && (
        <div className="auth-notice error" role="alert" style={{ margin: '1rem 0' }}>
          <span>{error}</span>
          <button className="tiny-button" onClick={() => setFetchKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {isInitialLoading ? (
        <NotificationListSkeleton count={5} />
      ) : error && items.length === 0 ? (
        <ErrorState
          error={error}
          onRetry={() => {
            setError('')
            setFetchKey((k) => k + 1)
          }}
        />
      ) : items.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No notifications"
            description={unreadOnly ? 'You have no unread notifications.' : 'You are all caught up.'}
            actionLabel={unreadOnly ? 'View all notifications' : undefined}
            onAction={
              unreadOnly
                ? () => {
                    setUnreadOnly(false)
                    setPage(1)
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <section className="panel notification-list">
          {items.map((notification) => (
            <div className={`notification-row ${notification.readAt ? '' : 'unread'}`} key={notification._id}>
              <div className="notification-icon">
                <Bell />
              </div>
              <div>
                <b>{notification.title}</b>
                <p>{notification.message}</p>
                <small>
                  {date(notification.createdAt)} · {statusLabel(notification.type)}
                </small>
              </div>
              <button
                className="row-more"
                disabled={Boolean(action)}
                aria-label={notification.readAt ? 'Notification already read' : 'Mark notification as read'}
                onClick={() => markRead(notification)}
              >
                {notification.readAt ? <StatusBadge tone="neutral">Read</StatusBadge> : <MoreHorizontal />}
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="table-footer">
        <span>
          Showing <b>{items.length ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)}` : '0'}</b> of {total} notifications
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
    </main>
  )
}

