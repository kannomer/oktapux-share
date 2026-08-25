import { db } from '../../db/index'
import { shares, files } from '../../db/schema'
import { desc, eq, sql } from 'drizzle-orm'

// Admin-only listing of every Crate on the instance. Used by the admin
// panel so the host can review and take down Crates 
// instead of only being able to wait for natural expiry.
export default defineEventHandler(async (event) => {
	await requireUserSession(event) // 401 if not logged in

	const rows = await db
		.select({
			id: shares.id,
			token: shares.token,
			name: shares.name,
			description: shares.description,
			created_at: shares.created_at,
			expires_at: shares.expires_at,
			max_downloads: shares.max_downloads,
			download_count: shares.download_count,
			is_reverse: shares.is_reverse,
			has_password: sql<boolean>`${shares.password_hash} is not null`,
			file_count: sql<number>`count(${files.id})`,
			total_size: sql<number>`coalesce(sum(${files.size}), 0)`
		})
		.from(shares)
		.leftJoin(files, eq(files.share_id, shares.id))
		.groupBy(shares.id)
		.orderBy(desc(shares.created_at))

	return rows
})
