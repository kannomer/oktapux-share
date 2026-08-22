import { db } from '../db/index';
import { shares, settings } from '../db/schema';
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { logger } from '../utils/logger';
import { recordError } from '../utils/metrics';
import { uploadRequestSchema } from '../utils/schemas/uploadRequestSchema';
import { isDbConstraintError } from '../utils/errors';

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
  const rawUploadFields = {
    expiry_type: uploadFields.expiry_type?.[0],
    expires_at: uploadFields.expires_at?.[0],
    max_downloads: uploadFields.max_downloads?.[0],
    name: uploadFields.name?.[0],
    description: uploadFields.description?.[0],
    password: uploadFields.password?.[0],
    slug: uploadFields.slug?.[0],
  };

  const parsedRequest = uploadRequestSchema.safeParse(rawUploadFields);
  if (!parsedRequest.success) {
    const issue = parsedRequest.error.issues[0];
    const field = issue?.path[0];
    const statusMessage = field === 'expiry_type'
      ? 'Invalid expiry type'
      : field === 'expires_at'
        ? 'Invalid date'
        : field === 'max_downloads'
          ? 'Invalid maximum download count'
          : field === 'password'
            ? 'Invalid password'
            : issue?.message ?? 'Invalid upload request';
    throw createError({ statusCode: 400, statusMessage });
  }

  const {
    expiry_type: expiryType,
    expires_at: expiresAt,
    max_downloads: parsedDownloads,
    name: shareName,
    description: shareDescription,
    password,
    slug: customSlug,
  } = parsedRequest.data;

  let parsedExpiry: Date | null = null;
  if (expiryType === 'date' && expiresAt) {
    parsedExpiry = new Date(expiresAt);
  }

  if (customSlug) {
    const checkSlug = await db.select().from(shares).where(eq(shares.token, customSlug)).limit(1);
    if (checkSlug.length) {
      throw createError({ statusCode: 409, statusMessage: 'This URL is taken' });
    }
    token = customSlug;
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
    const isTokenCollision = customSlug
      && isDbConstraintError(err)
      && /shares\.token/i.test(err.message);
    if (isTokenCollision) {
      throw createError({ statusCode: 409, statusMessage: "This URL is taken" });
    }
    recordError(err, { operation: 'create-share' });
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