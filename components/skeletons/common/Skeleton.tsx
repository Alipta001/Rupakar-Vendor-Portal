import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  width?: string | number
  height?: string | number
}

export function Skeleton({ className = '', style, width, height, ...props }: SkeletonProps) {
  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  }

  return (
    <div
      aria-hidden="true"
      className={`seller-skeleton-shimmer rounded ${className}`}
      style={dynamicStyle}
      {...props}
    />
  )
}
