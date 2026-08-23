import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { settings } from '../db/schema'
import { configPatchSchema } from '../utils/schemas/configPatchSchema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const body = await readBody(event)
  const parsed = configPatchSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid settings payload',
    })
  }

  const [row] = await db.select().from(settings).limit(1)

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Settings not found',
    })
  }

  await db.update(settings)
    .set(parsed.data)
    .where(eq(settings.id, row.id))

  return { success: true }
})
