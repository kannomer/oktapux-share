import { db } from '../../../../db/index'
import { shares, files } from '../../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { join } from 'node:path'
import { createReadStream } from 'node:fs'
import { reserveDownloadSlot } from '../../../../utils/download-limit'

// (This replaces the old `/api/files/[id]` route, which trusted a raw
// integer file id with no share-token check at all. Since file ids are
// sequential and every share's file listing exposes them, that meant
// anyone could enumerate ids 1, 2, 3... and pull files out of *any*
// passwordless share on the instance - without ever seeing that share's
// actual link. That route has been removed; this one requires the token
// to match the file's actual parent share.)
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token")
  const rawId = getRouterParam(event, "id")
  if (!token) throw createError({ statusCode: 400, message: "Missing token" })
  if (!rawId) throw createError({ statusCode: 400, message: "Missing file ID" })
  const fileId = parseInt(rawId)
  if (isNaN(fileId)) throw createError({ statusCode: 400, message: "Invalid file ID" })

  const [share] = await db.select().from(shares).where(eq(shares.token, token))
  if (!share) throw createError({ statusCode: 404, message: "Share not found" })

  if (share.expires_at && new Date() > share.expires_at) {
    throw createError({ statusCode: 410, message: "Share has expired" })
  }
  if (share.max_downloads && share.download_count >= share.max_downloads) {
    throw createError({ statusCode: 410, message: "Share has expired" })
  }

  const providedPassword = await verifySharePassword(event, share.password_hash, share.token, share.expires_at)

  // The check that was missing before: the file must actually belong to
  // the share named by the token, not just exist somewhere in the DB.
  const [file] = await db.select().from(files).where(and(eq(files.id, fileId), eq(files.share_id, share.id)))
  if (!file) throw createError({ statusCode: 404, message: "File not found" })

  setResponseHeader(event, "Content-Disposition", buildContentDisposition(file.original_name))
  setResponseHeader(event, "Content-Type", file.mime_type)
  setResponseHeader(event, "X-Content-Type-Options", "nosniff")

  const reserved = await reserveDownloadSlot(share.id)
  if (!reserved) throw createError({ statusCode: 410, message: "Share has expired" })

  const key = deriveFileKey(Buffer.from(file.salt, 'hex'), providedPassword)
  const decipher = createDecryptCipher(key, Buffer.from(file.iv, 'hex'), Buffer.from(file.auth_tag, 'hex'))
  const encryptedStream = createReadStream(join(process.cwd(), "uploads", file.stored_name))
  const stream = encryptedStream.pipe(decipher)

  return sendStream(event, stream)
})
