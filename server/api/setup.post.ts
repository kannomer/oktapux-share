import { db } from "../db/index"
import { admin, settings } from "../db/schema"
import { checkAdminExists, markAdminCreated } from "../utils/admin-state"
import { isDbConstraintError } from "../utils/errors"

export default defineEventHandler(async (event) => {
  // Fast path for normal requests, but the transaction below performs its own
  // authoritative check so two first-run requests cannot both complete setup.
  if (await checkAdminExists()) {
    throw createError({ statusCode: 403, message: "Setup has already been completed" })
  }

  const body = await readBody(event)
  const { username, password, confirmPassword } = body ?? {}

  if (!username || !password || !confirmPassword) {
    throw createError({ statusCode: 400, message: "Username, password, and password confirmation are required" })
  }

  if (password !== confirmPassword) {
    throw createError({ statusCode: 400, message: "Passwords do not match" })
  }

  const passwordHash = await hashSharePassword(password)

  try {
    await db.transaction(async (tx) => {
      const [existingAdmin] = await tx.select({ id: admin.id }).from(admin).limit(1)
      if (existingAdmin) {
        throw createError({ statusCode: 403, message: "Setup has already been completed" })
      }

      await tx.insert(admin).values({ username, password_hash: passwordHash })
      await tx.insert(settings).values({})
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 403) {
      throw error
    }
    if (isDbConstraintError(error)) {
      throw createError({ statusCode: 403, message: "Setup has already been completed" })
    }
    throw createError({ statusCode: 500, message: "Failed to complete setup" })
  }

  markAdminCreated()
  await setUserSession(event, { user: { username } })
  return { success: true }
})
