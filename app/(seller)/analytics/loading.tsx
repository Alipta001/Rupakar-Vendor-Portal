import { MetricCardsSkeleton, TableSkeleton, Skeleton } from '@/components/skeletons'

export default function AnalyticsLoading() {
  return (
    <main className="workspace space-y-6" aria-busy="true">
      <MetricCardsSkeleton count={5} />
      <section className="panel" style={{ padding: '1.5rem' }}>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[220px] w-full rounded" />
      </section>
      <div className="main-grid">
        <section className="panel" style={{ padding: '1.5rem' }}>
          <TableSkeleton rows={4} cols={3} />
        </section>
        <section className="panel" style={{ padding: '1.5rem' }}>
          <TableSkeleton rows={4} cols={3} />
        </section>
      </div>
    </main>
  )
}
