import { recordRequest } from '../utils/metrics'

export default defineEventHandler(() => {
  recordRequest()
})
