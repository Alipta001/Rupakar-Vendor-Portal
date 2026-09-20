'use client'

import { Bell, Check, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { notificationData } from '@/features/notifications/services/notification-data'
import { statusLabel } from '@/features/seller/types/seller.types'

export function NotificationsPage() {
  return <><PageHeader eyebrow="Inbox" title="Notifications" description="Stay on top of orders, payouts, reviews, and important seller updates." action={<button className="secondary-button"><Check /> Mark all read</button>} /><div className="notification-filters"><button className="active">All</button><button>Unread <span>{notificationData.list.filter((item) => item.unread).length}</span></button><button>Orders</button><button>Products</button><button>Finance</button></div><section className="panel notification-list">{notificationData.list.map((notification) => <div className={`notification-row ${notification.unread ? 'unread' : ''}`} key={notification.id}><div className="notification-icon"><Bell /></div><div><b>{notification.title}</b><p>{notification.body}</p><small>{notification.time} · {statusLabel(notification.type)}</small></div><button className="row-more"><MoreHorizontal /></button></div>)}</section></>
}
