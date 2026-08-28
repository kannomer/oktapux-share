import { db } from '../db/index'
import { shares, files } from '../db/schema'
import { lt, lte, and, isNotNull, inArray, or } from 'drizzle-orm'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

// Deletes one or more Crates, their file rows, and the encrypted blobs on
// disk. Shared by the cleanup scheduler (expired Crates) and the admin
// "delete Crate" endpoint.
export const deleteShares = async (shareIds: number[]): Promise<{ shareCount: number; fileCount: number }> => {
    if (!shareIds.length) return { shareCount: 0, fileCount: 0 }

    const targetFiles = await db.select().from(files).where(inArray(files.share_id, shareIds))

    for (const targetFile of targetFiles) {
        try {
            await unlink(join(process.cwd(), "uploads", targetFile.stored_name))
        } catch (err) { console.log(err) }
    }

    if (targetFiles.length) {
        await db.delete(files).where(inArray(files.share_id, shareIds))
    }
    await db.delete(shares).where(inArray(shares.id, shareIds))

    return { shareCount: shareIds.length, fileCount: targetFiles.length }
}

export const runCleanup = async () => {
    const expiredShares = await db.select().from(shares).where(
        or(
            and(isNotNull(shares.expires_at), lt(shares.expires_at, new Date())),
            and(isNotNull(shares.max_downloads), lte(shares.max_downloads, shares.download_count))
        )
    )
    if(!expiredShares.length){ console.log("No expired Crates found"); return }

    const { shareCount, fileCount } = await deleteShares(expiredShares.map(share => share.id))

    console.log(`Cleanup complete. Removed ${shareCount} Crate(s) and ${fileCount} file(s)`)
}

export const startCleanupScheduler = (intervalMs: number = 1000 * 60 * 15) => {
    runCleanup()

    const interval = setInterval(runCleanup, intervalMs)
    return interval
}
