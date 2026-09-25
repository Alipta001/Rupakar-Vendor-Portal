import React from 'react'
import { Skeleton } from '../common/Skeleton'

export interface MetricCardsSkeletonProps {
  count?: number
  className?: string
}

export function MetricCardsSkeleton({ count = 4, className = '' }: MetricCardsSkeletonProps) {
  return (
    <div
      className={`metrics-grid ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading metrics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton height={12} width="50%" />
            <Skeleton width={20} height={20} style={{ borderRadius: '4px' }} />
          </div>
          <Skeleton height={28} width="65%" style={{ marginTop: '4px' }} />
          <Skeleton height={12} width="40%" style={{ marginTop: '4px' }} />
        </div>
      ))}
    </div>
  )
}
