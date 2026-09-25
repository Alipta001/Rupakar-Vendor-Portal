import { Skeleton } from '@/components/skeletons'

export default function NotificationsLoading() {
  return (
    <main className="workspace">
      <section className="panel notification-list" aria-busy="true" aria-label="Loading notifications">
        {Array.from({ length: 6 }).map((_, index) => (
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
    </main>
  )
}
