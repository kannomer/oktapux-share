import { eq } from "drizzle-orm"
import { db } from "../../db/index"
import { admin } from "../../db/schema"

export default defineEventHandler(async (event) => {
	// Throttle login attempts per IP before touching the DB or doing any
	// password work, so repeated guesses get a fast 429 instead of paying
	// the scrypt cost on every try.
	checkRateLimit(`admin-login:${getClientIp(event)}`, 5, 15 * 60 * 1000)

	const { username, password } = await readBody(event)

	const [row] = await db.select().from(admin).where(eq(admin.username, username))
	if(!row) throw createError({ statusCode: 401, message: "Invalid Credentials" })
	
	const valid = await verifySharePasswordHash(password, row.password_hash)
	if(!valid) throw createError({ statusCode: 401, message: "Invalid Credentials"})
	
	await setUserSession(event, { user: { username: row.username } })
	return {success: true}
})