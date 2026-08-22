import { db } from "../db/index"
import { admin, settings } from "../db/schema"
import { checkAdminExists, markAdminCreated } from "../utils/admin-state"
import { isDbConstraintError } from "../utils/errors"

export default defineEventHandler(async (event) => {
  // Fast path. The transaction below performs the authoritative check.
  if (await checkAdminExists()) {
    throw createError({
      statusCode: 403,
      message: "Setup has already been completed"
    })
  }

  const body = await readBody(event)
  const { username, password, confirmPassword } = body ?? {}

  if (!username || !password || !confirmPassword) {
    throw createError({
      statusCode: 400,
      message: "Username, password, and password confirmation are required"
    })
  }

  if (password !== confirmPassword) {
    throw createError({
      statusCode: 400,
      message: "Passwords do not match"
    })
  }

  const passwordHash = await hashSharePassword(password)

  try {
    // better-sqlite3 transactions are synchronous.
    // Do not make this callback async and do not invoke the
    // result of db.transaction().
    db.transaction((tx) => {
      const existingAdmin = tx
        .select({ id: admin.id })
        .from(admin)
        .limit(1)
        .all()[0]

      if (existingAdmin) {
        throw createError({
          statusCode: 403,
          message: "Setup has already been completed"
        })
      }

      tx.insert(admin)
        .values({
          username: username.trim(),
          password_hash: passwordHash
        })
        .run()

      tx.insert(settings)
        .values({})
        .run()
    })
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === 403
    ) {
      throw error
    }

    if (isDbConstraintError(error)) {
      throw createError({
        statusCode: 403,
        message: "Setup has already been completed"
      })
    }

    console.error("Failed to complete setup", error)

    throw createError({
      statusCode: 500,
      message: "Failed to complete setup"
    })
  }

  // The database transaction has definitely committed at this point.
  markAdminCreated()

  // Session creation happens after the transaction. If this fails,
  // setup itself must still be considered successful because the
  // admin account already exists.
  try {
    await setUserSession(event, {
      user: {
        username: username.trim()
      }
    })
  } catch (error) {
    console.error(
      "Setup completed, but failed to initialize the admin session",
      error
    )

    return {
      success: true,
      sessionInitialized: false
    }
  }

  return {
    success: true,
    sessionInitialized: true
  }
})