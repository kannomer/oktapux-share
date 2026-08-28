import { db } from '../db/index';
import { shares, settings } from '../db/schema';
import { nanoid } from "nanoid";
import { expiryDateSchema, expiryTypeSchema, passwordSchema } from '../utils/validation';

// Creates a file collection (a "file request" link). No files are attached at
// creation time, files arrive later from submitters via
// POST /api/reverse/[uploadToken]. Two tokens get generated: `token` is the
// private owner link (used at /s/[token] to view collected files later),
// `upload_token` is the public link handed out to submitters (used at
// /r/[uploadToken] to upload only).
export default defineEventHandler(async (event) => {
  checkRateLimit(`reverse-create:${getClientIp(event)}`, 20, 10 * 60 * 1000)

  const [config] = await db.select().from(settings).limit(1)
  if (!config) {
    throw createError({ statusCode: 500, message: "Server is not configured yet" })
  }

  if (!config.allow_reverse_shares) {
    throw createError({ statusCode: 403, message: "Collections are disabled on this server" })
  }

  const body = await readBody(event)
  const { name, description, expiry_type: expiryType, expires_at: expiresAt, password } = body ?? {}

  if (expiryType) {
    const result = expiryTypeSchema.safeParse(expiryType)
    if (!result.success) {
      throw createError({ statusCode: 400, message: "Invalid expiry type" })
    }
  }

  let parsedExpiry: Date | null = null
  if (expiryType === "date" && expiresAt) {
    const result = expiryDateSchema.safeParse(expiresAt)
    if (!result.success) {
      throw createError({ statusCode: 400, message: "Invalid date" })
    }
    parsedExpiry = new Date(result.data)
  }

  if (password) {
    const result = passwordSchema.safeParse(password)
    if (!result.success) {
      throw createError({ statusCode: 400, message: "Invalid password" })
    }
  }

  // Same config enforcement upload.post.ts applies before any files exist.
  // max_file_size isn't checked here,
  // that's enforced later in the reverse-upload endpoint.
  if (!config.allow_passwordless_shares && !password) {
    throw createError({ statusCode: 400, message: "This server requires a password on all Crates" })
  }

  if (!config.allow_permanent_shares && expiryType === "permanent") {
    throw createError({ statusCode: 400, message: "Permanent Crates are disabled on this server" })
  }

  if (config.max_expiry_days && expiryType === "date") {
    const maxAllowed = new Date()
    maxAllowed.setDate(maxAllowed.getDate() + config.max_expiry_days)
    if (parsedExpiry && parsedExpiry > maxAllowed) {
      throw createError({ statusCode: 400, message: `Expiry cannot exceed ${config.max_expiry_days} days` })
    }
  }

  const passwordHash = password ? await hashSharePassword(password) : null

  const [share] = await db.insert(shares).values({
    token: nanoid(),
    upload_token: nanoid(),
    is_reverse: true,
    expires_at: parsedExpiry,
    max_downloads: null,
    name,
    description,
    password_hash: passwordHash
  }).returning()
  if (!share) {
    throw createError({ statusCode: 500, message: "Failed to create Collection" });
  }

  return { token: share.token, upload_token: share.upload_token };
});
