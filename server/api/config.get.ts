import { db } from "../db/index"
import { settings } from "../db/schema"

export default defineEventHandler(async () => {
	const [row] = await db.select().from(settings).limit(1)
	return row
})