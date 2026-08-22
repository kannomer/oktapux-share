import { db } from '../db/index';
import { shares, settings } from '../db/schema';
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { logger } from '../utils/logger';
import { recordError } from '../utils/metrics';
import { expiryDateSchema, expiryTypeSchema, maxDownloadsSchema, passwordSchema, slugSchema } from '../utils/validation';

export default defineEventHandler(async (event) => {
  checkRateLimit(`upload:${getClientIp(event)}`, 20, 10 * 60 * 1000);

  const [config] = await db.select().from(settings).limit(1);
  if (!config) {
    throw createError({ statusCode: 500, statusMessage: "Server is not configured yet" });
  }

  const [uploadFields, uploadFiles] = await parseUploadForm(event, config.max_file_size);

  if (uploadFiles?.["files"] === undefined || uploadFiles?.["files"].length == 0) {
    logger.warn({ requestId: getHeader(event, 'x-request-id') ?? undefined, ip: getClientIp(event) }, "Upload request contains no files");
    throw createError({ statusCode: 400, statusMessage: "Validation failed. No files exist in request" });
  }

  let token = nanoid();
  const expiryType = uploadFields.expiry_type?.[0];
  const expiresAt = uploadFields.expires_at?.[0];
  const maxDownloads = uploadFields.max_downloads?.[0];
  const shareName = uploadFields.name?.[0];
  const shareDescription = uploadFields.description?.[0];
  const password = uploadFields.password?.[0];
  const customSlug = uploadFields.slug?.[0];

  if (expiryType) {
    const result = expiryTypeSchema.safeParse(expiryType);
    if (!result.success) {
      throw createError({ statusCode: 400, statusMessage: "Invalid expiry type" });
    }
  }

  let parsedExpiry: Date | null = null;
  let parsedDownloads: number | null = null;
  if (expiryType === "date" && expiresAt) {
    const result = expiryDateSchema.safeParse(expiresAt);
    if (!result.success) {
      throw createError({ statusCode: 400, statusMessage: "Invalid date" });
    }
    parsedExpiry = new Date(result.data);
  }
  if (expiryType === "downloads" && maxDownloads) {
    const result = maxDownloadsSchema.safeParse(maxDownloads);
    if (!result.success) {
      throw createError({ statusCode: 400, statusMessage: "Invalid maximum download count" });
    }
    parsedDownloads = result.data;
  }
  if (customSlug) {
    const result = slugSchema.safeParse(customSlug);
    if (!result.success) {
      throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message ?? "Invalid slug" });
    }

    const checkSlug = await db.select().from(shares).where(eq(shares.token, result.data)).limit(1);
    if (checkSlug.length) {
      throw createError({ statusCode: 409, statusMessage: "This URL is taken" });
    }
    token = result.data;
  }

  if (password) {
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      throw createError({ statusCode: 400, statusMessage: "Invalid password" });
    }
  }

  for (const file of uploadFiles["files"]) {
    if (file.size > config.max_file_size) {
      throw createError({ statusCode: 400, statusMessage: `File exceeds the maximum allowed size of ${formatBytes(config.max_file_size)}` });
    }
  }

  if (!config.allow_passwordless_shares && !password) {
    throw createError({ statusCode: 400, statusMessage: "This server requires a password on all shares" });
  }

  if (!config.allow_permanent_shares && expiryType === "permanent") {
    throw createError({ statusCode: 400, statusMessage: "Permanent shares are disabled on this server" });
  }

  if (config.max_expiry_days && expiryType === "date") {
    const maxAllowed = new Date();
    maxAllowed.setDate(maxAllowed.getDate() + config.max_expiry_days);
    if (parsedExpiry && parsedExpiry > maxAllowed) {
      throw createError({ statusCode: 400, statusMessage: `Expiry cannot exceed ${config.max_expiry_days} days` });
    }
  }

  if (config.max_expiry_days && config.cap_download_based_expiry && expiryType === "downloads") {
    const cappedExpiry = new Date();
    cappedExpiry.setDate(cappedExpiry.getDate() + config.max_expiry_days);
    parsedExpiry = cappedExpiry;
  }

  const passwordHash = password ? await hashSharePassword(password) : null;

  let share;
  try {
    [share] = await db.insert(shares).values({
      token,
      expires_at: parsedExpiry,
      max_downloads: parsedDownloads,
      name: shareName,
      description: shareDescription,
      password_hash: passwordHash
    }).returning();
  } catch (err) {
	const dbError = err as {
		code?: string
		message?: string
  	}
    const isTokenCollision = customSlug
      && (dbError.code === 'SQLITE_CONSTRAINT_UNIQUE' || dbError.code === 'SQLITE_CONSTRAINT')
      && typeof dbError.message === 'string'
      && /shares\.token/i.test(dbError.message);
    if (isTokenCollision) {
      throw createError({ statusCode: 409, statusMessage: "This URL is taken" });
    }
    recordError();
    logger.error({ err, requestId: getHeader(event, 'x-request-id') ?? undefined }, 'Failed to create share');
    throw createError({ statusCode: 500, statusMessage: "Failed to create share" });
  }
  if (!share) {
    throw createError({ statusCode: 500, statusMessage: "Failed to create share" });
  }

  for (const file of uploadFiles["files"]) {
    await storeEncryptedFile(file, share.id, password);
  }
  return { token };
});