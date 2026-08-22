let requestCount = 0
let errorCount = 0

export const recordRequest = () => {
  requestCount += 1
}

export const recordError = () => {
  errorCount += 1
}

export const getMetrics = () => ({
  requests: requestCount,
  errors: errorCount,
})

export const resetMetrics = () => {
  requestCount = 0
  errorCount = 0
}
