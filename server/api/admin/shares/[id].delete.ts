import { db } from '../../../db/index'
import { shares } from '../../../db/schema'
import { eq } from 'drizzle-orm'

// Lets an admin manually take down a Crate 
// instead of only being 
// able to wait for it to expire.
export default defineEventHandler(async (event) => {
	await requireUserSession(event) // 401 if not logged in

	const rawId = getRouterParam(event, "id")
	const shareId = rawId ? parseInt(rawId) : NaN
	if (isNaN(shareId)) throw createError({ statusCode: 400, message: "Invalid Crate ID" })

	const [share] = await db.select().from(shares).where(eq(shares.id, shareId)).limit(1)
	if (!share) throw createError({ statusCode: 404, message: "Crate not found" })

	await deleteShares([shareId])

	return { success: true }
})
