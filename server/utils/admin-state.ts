import { db } from "../db/index"
import { admin } from "../db/schema"

// Only ever flips false -> true, never back, so caching it in memory for
// the lifetime of the process is safe. Avoids a DB read on every single
// request once setup is done.
let adminExists: boolean | null = null;

export const checkAdminExists = async(): Promise<boolean> => {
	if (adminExists) return true

	const [row] = await db.select().from(admin).limit(1)
	adminExists = !!row
	return adminExists
}

// Call this immediately after POST /api/setup successfully inserts the
// admin row, so the very next request already short-circuits.
export const markAdminCreated = (): void => {
	adminExists = true
}