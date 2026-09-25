import React from 'react'
import { Skeleton } from '../common/Skeleton'
import { MetricCardsSkeleton } from '../metric/MetricCardsSkeleton'
import { TableSkeleton } from '../table/TableSkeleton'

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Verification banner skeleton */}
      <div
        className="verification-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px',
          borderRadius: '8px',
          background: 'var(--surface-subtle)',
        }}
      >
        <Skeleton width={36} height={36} style={{ borderRadius: '50%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <Skeleton height={16} width="35%" />
          <Skeleton height={12} width="60%" />
        </div>
      </div>

      {/* 4 Metric cards */}
      <MetricCardsSkeleton count={4} />

      {/* Main Grid: Chart + Quick Actions */}
      <div className="main-grid">
        <section className="panel sales-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '50%' }}>
              <Skeleton height={18} width="40%" />
              <Skeleton height={12} width="60%" />
            </div>
            <Skeleton height={32} width={180} />
          </div>
          <div style={{ height: '190px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '16px' }}>
            <Skeleton height="70%" style={{ flex: 1 }} />
            <Skeleton height="45%" style={{ flex: 1 }} />
            <Skeleton height="85%" style={{ flex: 1 }} />
            <Skeleton height="60%" style={{ flex: 1 }} />
            <Skeleton height="95%" style={{ flex: 1 }} />
            <Skeleton height="75%" style={{ flex: 1 }} />
            <Skeleton height="80%" style={{ flex: 1 }} />
          </div>
        </section>

        <section className="panel quick-panel" style={{ padding: '20px' }}>
          <Skeleton height={18} width="50%" style={{ marginBottom: '16px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'var(--surface-subtle)',
                }}
              >
                <Skeleton width={32} height={32} style={{ borderRadius: '6px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <Skeleton height={14} width="45%" />
                  <Skeleton height={10} width="65%" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Secondary Grid: Recent orders & Low stock tables */}
      <div className="main-grid">
        <section className="panel table-panel" style={{ padding: '20px' }}>
          <Skeleton height={18} width="40%" style={{ marginBottom: '16px' }} />
          <TableSkeleton columns={3} rows={4} hasCheckbox={false} />
        </section>
        <section className="panel table-panel" style={{ padding: '20px' }}>
          <Skeleton height={18} width="40%" style={{ marginBottom: '16px' }} />
          <TableSkeleton columns={2} rows={4} hasCheckbox={false} />
        </section>
      </div>
    </div>
  )
}
