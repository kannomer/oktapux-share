import { db } from '../db/index'
import { settings } from '../db/schema'
import { logger } from '../utils/logger'

export default defineEventHandler(async (event) => {
  try {
    await db.select({ id: settings.id }).from(settings).limit(1)
    return { status: 'ok' }
  } catch (error) {
    logger.error(
      { err: error, requestId: getHeader(event, 'x-request-id') ?? undefined },
      'Health check failed',
    )
    throw createError({ statusCode: 503, message: 'Service unavailable' })
  }
})
