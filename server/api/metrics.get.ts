import { getMetrics } from '../utils/metrics'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  return getMetrics()
})
