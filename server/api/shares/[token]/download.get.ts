import { db } from '../../../db/index'
import { shares, files } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import archiver from 'archiver'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
    const token = getRouterParam(event, "token");
    if(!token) throw createError({ statusCode: 400, message: "Token missing"});

    const [share] = await db.select().from(shares).where(eq(shares.token, token));
    if(!share) throw createError({ statusCode: 404, message: "Share not found"});
    if(share.expires_at && new Date() > share.expires_at) throw createError({ statusCode: 410, message: "Share has expired" });
    if(share.max_downloads && share.download_count >= share.max_downloads)throw createError({ statusCode: 410, message: "Share has expired" });

    const providedPassword = await verifySharePassword(event, share.password_hash)

    const shareFiles = await db.select().from(files).where(eq(files.share_id, share.id));
    if(!shareFiles || shareFiles.length === 0) throw createError({ statusCode: 404, message: "Files not found" });

    setResponseHeader(event, "Content-Disposition", buildContentDisposition(`share-${token}.zip`));
    setResponseHeader(event, "Content-Type", "application/zip");

    const archive = archiver("zip", { zlib: { level: 6 } })
    archive.pipe(event.node.res)
    const usedNames = new Set<string>()
    for(const shareFile of shareFiles){
        const key = deriveFileKey(Buffer.from(shareFile.salt, 'hex'), providedPassword)
        const decipher = createDecryptCipher(key, Buffer.from(shareFile.iv, 'hex'), Buffer.from(shareFile.auth_tag, 'hex'))
        const decryptedStream = createReadStream(join(process.cwd(), "uploads", shareFile.stored_name)).pipe(decipher)
        // Reduced to a safe basename. See sanitizeArchiveEntryName for why
        // the raw original_name can't be trusted as an archive entry path.
        let entryName = sanitizeArchiveEntryName(shareFile.original_name)
        if (usedNames.has(entryName)) {
            entryName = `${shareFile.id}-${entryName}`
        }
        usedNames.add(entryName)
        archive.append(decryptedStream, { name: entryName })
    }
    await new Promise<void>((resolve, reject) => {
        archive.on('finish', resolve)
        archive.on('error', reject)
        archive.finalize()
    })
    await db.update(shares).set({ download_count: share.download_count+1}).where(eq(shares.id, share.id));
})
