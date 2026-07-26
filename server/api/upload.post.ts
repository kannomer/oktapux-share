import { db } from '../db/index';
import { shares, settings } from '../db/schema';
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  // Load server config before parsing 
  // max_file_size needs to be handed
  // to formidable itself so oversized uploads are rejected mid-parse,
  // not after the whole file has already been received.
  const [config] = await db.select().from(settings).limit(1)
  if (!config) {
    throw createError({ statusCode: 500, message: "Server is not configured yet" })
  }

  const [uploadFields, uploadFiles] = await parseUploadForm(event, config.max_file_size)

  // make sure files exist in the request
  if(uploadFiles?.["files"] === undefined || uploadFiles?.["files"].length == 0) {
    console.error("Files doesn't exist in request")
    throw createError({ statusCode: 400, message: "Validation failed. No files exist in request"})
  }

  let token = nanoid()
  const expiryType = uploadFields.expiry_type?.[0]
  const expiresAt = uploadFields.expires_at?.[0]
  const maxDownloads = uploadFields.max_downloads?.[0]
  const shareName = uploadFields.name?.[0]
  const shareDescription = uploadFields.description?.[0]
  const password = uploadFields.password?.[0]
  const customSlug = uploadFields.slug?.[0]

  let parsedExpiry: Date | null = null
  let parsedDownloads: number | null = null
  if (expiryType === "date" && expiresAt) {
    parsedExpiry = new Date(expiresAt)
  }
  if (expiryType === "downloads" && maxDownloads) {
    parsedDownloads = Number(maxDownloads)
  }
  if (parsedExpiry && isNaN(parsedExpiry.getTime())) {
  throw createError({ statusCode: 400, message: "Invalid date" })
  }
  if(customSlug) {
	if (/^[A-Za-z0-9_-]{3,50}$/.test(customSlug)) {
		const checkSlug = await db.select().from(shares).where(eq(shares.token, customSlug)).limit(1)
		if(checkSlug.length) {
			throw createError({ statusCode: 409, message: "This URL is taken" })
		}
		token = customSlug
	}
	else {
		throw createError({ statusCode: 400, message: "The slug should contain only letters, numbers and underscores. 3-50 length"})
	}
  }
  // ---- Server config enforcement ----
  // These mirror the toggles/caps shown (or hidden) on the frontend, but
  // must be re-checked here since the frontend can be bypassed entirely
  // by calling this endpoint directly.

  for (const file of uploadFiles["files"]) {
    if (file.size > config.max_file_size) {
      throw createError({ statusCode: 400, message: `File exceeds the maximum allowed size of ${formatBytes(config.max_file_size)}` })
    }
  }

  if (!config.allow_passwordless_shares && !password) {
    throw createError({ statusCode: 400, message: "This server requires a password on all shares" })
  }

  if (!config.allow_permanent_shares && expiryType === "permanent") {
    throw createError({ statusCode: 400, message: "Permanent shares are disabled on this server" })
  }

  if (config.max_expiry_days && expiryType === "date") {
    const maxAllowed = new Date()
    maxAllowed.setDate(maxAllowed.getDate() + config.max_expiry_days)
    if (parsedExpiry && parsedExpiry > maxAllowed) {
      throw createError({ statusCode: 400, message: `Expiry cannot exceed ${config.max_expiry_days} days` })
    }
  }

  // Downloads-based shares can also be capped to the same day limit, so
  // whichever condition (download count or days) hits first ends the share.
  // existing cleanup logic already checks both independently.
  if (config.max_expiry_days && config.cap_download_based_expiry && expiryType === "downloads") {
    const cappedExpiry = new Date()
    cappedExpiry.setDate(cappedExpiry.getDate() + config.max_expiry_days)
    parsedExpiry = cappedExpiry
  }
  // ---- end server config enforcement ----

  const passwordHash = password ? await hashPassword(password) : null

  const [share] = await db.insert(shares).values({
    token,
    expires_at: parsedExpiry,
    max_downloads: parsedDownloads,
    name: shareName,
    description: shareDescription,
    password_hash: passwordHash
  }).returning()
  if (!share) {
    throw createError({ statusCode: 500, message: "Failed to create share" });
  }

  // Loop through uploaded files:
  for (const file of uploadFiles["files"]) {
    await storeEncryptedFile(file, share.id, password)
  }
  return { token };
});
