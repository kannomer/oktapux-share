import { eq } from "drizzle-orm"
import { db } from "../../db/index"
import { admin } from "../../db/schema"

export default defineEventHandler(async (event) => {
	const { username, password } = await readBody(event)

	const [row] = await db.select().from(admin).where(eq(admin.username, username))
	if(!row) throw createError({ statusCode: 401, message: "Invalid Credentials" })
	
	const valid = await verifyPassword(password, row.password_hash)
	if(!valid) throw createError({ statusCode: 401, message: "Invalid Credentials"})
	
	await setUserSession(event, { user: { username: row.username } })
	return {success: true}
})