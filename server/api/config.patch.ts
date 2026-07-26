import { eq } from "drizzle-orm"
import { db } from "../db/index"
import { settings } from "../db/schema"

export default defineEventHandler(async (event) => {
	const session = await requireUserSession(event) // 401 if not logged in

	const body = await readBody(event)
	// Only allow known columns through — never spread raw body into .set()
	const {
		max_file_size,
		allow_passwordless_shares,
		allow_permanent_shares,
		max_expiry_days,
		cap_download_based_expiry,
		enable_qr_code,
		allow_reverse_shares,
		site_name
	} = body

	const [row] = await db.select().from(settings).limit(1)
	if (!row) {
	throw createError({ statusCode: 404, statusMessage: "Settings not found" })
	}

	await db.update(settings).set({
		max_file_size,
		allow_passwordless_shares,
		allow_permanent_shares,
		max_expiry_days,
		cap_download_based_expiry,
		enable_qr_code,
		allow_reverse_shares,
		site_name
	}).where(eq(settings.id, row.id))

	return { success: true }
})