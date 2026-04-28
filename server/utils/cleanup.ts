import { db } from '../db/index'
import { shares, files } from '../db/schema'
import { lt, lte, and, isNotNull, inArray, or } from 'drizzle-orm'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'

export const runCleanup = async () => {
    const expiredShares = await db.select().from(shares).where(
        or(
            and(isNotNull(shares.expires_at), lt(shares.expires_at, new Date())),
            and(isNotNull(shares.max_downloads), lte(shares.max_downloads, shares.download_count))
        )
    )
    if(!expiredShares.length){ console.log("No expired shares found"); return }

    const expiredShareIds = expiredShares.map(share => share.id);
    const expiredFiles = await db.select().from(files).where(
        inArray(files.share_id, expiredShareIds)
    )

    for(const expiredFile of expiredFiles){
        try{
            await unlink(join(process.cwd(), "uploads", expiredFile.stored_name));
        } catch(err){ console.log(err) }
    }

    if(expiredFiles.length){
        await db.delete(files).where(inArray(files.share_id, expiredShareIds))
    }
    await db.delete(shares).where(inArray(shares.id, expiredShareIds))

    console.log(`Cleanup complete. Removed ${expiredShares.length} share(s) and ${expiredFiles.length} file(s)`)
}

export const startCleanupScheduler = (intervalMs: number = 1000 * 60) => {
    runCleanup()

    const interval = setInterval(runCleanup, intervalMs)
    return interval
}
