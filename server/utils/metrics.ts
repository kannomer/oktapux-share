import { reportError } from './errorTracking'

let requestCount = 0
let errorCount = 0

export const recordRequest = () => {
  requestCount += 1
}

export const recordError = (error?: unknown, context: Record<string, unknown> = {}) => {
  errorCount += 1
  void reportError(error ?? new Error('Recorded application error'), context)
}

export const getMetrics = () => ({
  requests: requestCount,
  errors: errorCount,
})

export const resetMetrics = () => {
  requestCount = 0
  errorCount = 0
}
