import { db } from "../db/index"
import { admin, settings } from "../db/schema"
import { checkAdminExists, markAdminCreated } from "../utils/admin-state"

export default defineEventHandler(async (event) => {
	if (await checkAdminExists()) {
		throw createError({ statusCode: 403, message: "Setup has already been completed" })
	}

	const body = await readBody(event)
	const { username, password } = body
	
	if(!username || !password) {
		throw createError({ statusCode: 400, message: "Username and password required" })
	}

	const passwordHash = await hashPassword(password)

	await db.insert(admin).values({ username, password_hash: passwordHash })
	await db.insert(settings).values({}) // defaults

	markAdminCreated()

	await setUserSession(event, { user: { username } })
	return { success: true }
})