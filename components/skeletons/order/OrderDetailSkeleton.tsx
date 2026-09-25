import React from 'react'
import { Skeleton } from '../common/Skeleton'

export function OrderDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading order details"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Top action header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '40%' }}>
          <Skeleton height={24} width="60%" />
          <Skeleton height={14} width="40%" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton height={36} width={100} />
          <Skeleton height={36} width={120} />
        </div>
      </div>

      {/* Status banner */}
      <div
        style={{
          padding: '16px',
          borderRadius: '8px',
          background: 'var(--surface-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width={28} height={28} style={{ borderRadius: '50%' }} />
          <Skeleton height={16} width={140} />
        </div>
        <Skeleton height={24} width={90} style={{ borderRadius: '12px' }} />
      </div>

      {/* Grid: 2 columns */}
      <div className="main-grid">
        {/* Left: Items list */}
        <section className="panel" style={{ padding: '20px' }}>
          <Skeleton height={18} width="30%" style={{ marginBottom: '16px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Skeleton width={60} height={60} style={{ borderRadius: '6px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <Skeleton height={16} width="50%" />
                  <Skeleton height={12} width="30%" />
                  <Skeleton height={12} width="20%" />
                </div>
                <Skeleton height={16} width={70} />
              </div>
            ))}
          </div>
        </section>

        {/* Right: Customer & Address */}
        <section className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Skeleton height={18} width="40%" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton height={14} width="70%" />
            <Skeleton height={14} width="50%" />
            <Skeleton height={14} width="85%" />
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton height={14} width="40%" />
            <Skeleton height={14} width="60%" />
          </div>
        </section>
      </div>
    </div>
  )
}
