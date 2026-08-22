import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '../db/index'
import { shares } from '../db/schema'

// Reserves one download slot atomically. A read-then-write sequence is not
// sufficient here: two concurrent requests could both observe the same count
// and exceed max_downloads. SQLite evaluates this UPDATE as one write.
export const reserveDownloadSlot = async (shareId: number): Promise<boolean> => {
  const result = await db
    .update(shares)
    .set({ download_count: sql`${shares.download_count} + 1` })
    .where(
      and(
        eq(shares.id, shareId),
        or(isNull(shares.max_downloads), lt(shares.download_count, shares.max_downloads)),
      ),
    )
    .returning({ id: shares.id })

  return result.length === 1
}
