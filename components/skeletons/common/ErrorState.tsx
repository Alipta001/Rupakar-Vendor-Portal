import React from 'react'
import { isColdStartError, getApiErrorMessage } from '@/lib/api/errors'

export interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  className?: string
  fallbackMessage?: string
}

export function ErrorState({
  error,
  onRetry,
  className = '',
  fallbackMessage = 'Unable to load seller data',
}: ErrorStateProps) {
  const coldStart = isColdStartError(error)
  const message = getApiErrorMessage(error, fallbackMessage)

  return (
    <div className={`auth-notice error ${className}`} role="alert">
      <div>
        <p style={{ margin: 0, fontWeight: 500 }}>
          {coldStart ? "We're taking a little longer than usual to connect." : message}
        </p>
        {coldStart && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.85 }}>
            The server may be waking up after inactivity. Please hold on or try again.
          </p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          className="secondary-button"
          onClick={onRetry}
          style={{ marginTop: '8px' }}
        >
          Try Again
        </button>
      )}
    </div>
  )
}
