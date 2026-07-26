import { db } from '../../db/index';
import { shares, settings } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Where submitters actually POST files to a reverse share. No name,
// description, expiry, or password fields are read here, those were
// already fixed when the share was created via POST /api/reverse.
export default defineEventHandler(async (event) => {
  const uploadToken = getRouterParam(event, "uploadToken");
  if (!uploadToken) throw createError({ statusCode: 400, message: 'Missing upload token' });

  const [share] = await db.select().from(shares).where(eq(shares.upload_token, uploadToken))
  if (!share || !share.is_reverse) {
    throw createError({ statusCode: 404, message: "Share not found" })
  }

  if (share.expires_at && new Date() > share.expires_at) {
    throw createError({ statusCode: 410, message: "This request has closed" })
  }

  const password = await verifySharePassword(event, share.password_hash)

  const [config] = await db.select().from(settings).limit(1)
  if (!config) {
    throw createError({ statusCode: 500, message: "Server is not configured yet" })
  }

  const [, uploadFiles] = await parseUploadForm(event, config.max_file_size)

  if (uploadFiles?.["files"] === undefined || uploadFiles?.["files"].length == 0) {
    throw createError({ statusCode: 400, message: "Validation failed. No files exist in request" })
  }

  for (const file of uploadFiles["files"]) {
    if (file.size > config.max_file_size) {
      throw createError({ statusCode: 400, message: `File exceeds the maximum allowed size of ${formatBytes(config.max_file_size)}` })
    }
  }

  for (const file of uploadFiles["files"]) {
    await storeEncryptedFile(file, share.id, password)
  }

  return { success: true, count: uploadFiles["files"].length };
});
