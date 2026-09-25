import { Skeleton } from '@/components/skeletons'

export default function VerificationLoading() {
  return (
    <main className="workspace" aria-busy="true">
      <div className="verification-layout">
        <section className="panel verification-hero" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem' }}>
          <Skeleton className="w-16 h-16 rounded-full" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
        </section>
        <section className="panel verification-checklist" style={{ padding: '1.5rem' }}>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="check-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Skeleton className="w-6 h-6 rounded-full" />
                <div style={{ flex: 1 }}>
                  <Skeleton className="h-4 w-40 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
