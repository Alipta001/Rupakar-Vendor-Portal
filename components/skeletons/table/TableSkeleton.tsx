import React from 'react'
import { Skeleton } from '../common/Skeleton'

export interface TableSkeletonProps {
  columns?: number
  cols?: number
  rows?: number
  hasCheckbox?: boolean
  className?: string
}

export function TableSkeleton({
  columns,
  cols,
  rows = 6,
  hasCheckbox = true,
  className = '',
}: TableSkeletonProps) {
  const colCount = cols ?? columns ?? 5

  return (
    <div
      className={`table-scroll ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading table data"
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {hasCheckbox && (
              <th className="check" style={{ width: '40px' }}>
                <Skeleton width={16} height={16} />
              </th>
            )}
            {Array.from({ length: colCount }).map((_, i) => (
              <th key={i}>
                <Skeleton height={14} width={i === 0 ? '120px' : i === 1 ? '80px' : '90px'} />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {hasCheckbox && (
                <td className="check">
                  <Skeleton width={16} height={16} />
                </td>
              )}
              {Array.from({ length: colCount }).map((_, colIndex) => (
                <td key={colIndex}>
                  {colIndex === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Skeleton width={36} height={36} style={{ borderRadius: '6px' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <Skeleton height={14} width="75%" />
                        <Skeleton height={10} width="40%" />
                      </div>
                    </div>
                  ) : (
                    <Skeleton
                      height={14}
                      width={
                        colIndex === 1
                          ? '60%'
                          : colIndex === 2
                          ? '45%'
                          : colIndex === 3
                          ? '50%'
                          : '40%'
                      }
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
