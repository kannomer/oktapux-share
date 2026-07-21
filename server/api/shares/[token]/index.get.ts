import { db } from '../../../db/index';
import { shares, files } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  // Get the token from the URL params
  const token = getRouterParam(event, "token");
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' });

  // Query the shares table
  const [share] = await db.select().from(shares).where(eq(shares.token, token))
  if(!share) throw createError({ statusCode: 404, message: "Share not found" })

  // Check if the share is expired
  if(share.expires_at && new Date() > share.expires_at) {
    throw createError({ statusCode: 410, message: "Share has expired" })
  }
  if(share.max_downloads && share.download_count >= share.max_downloads) {
    throw createError({ statusCode: 410, message: "Share has expired" })
  }

  // Check password protection
  await requirePasswordIfProtected(event, share.password_hash)

  // Query the files table for all files belonging to this share
  const shareFiles = await db.select().from(files).where(eq(files.share_id, share.id))

  const { password_hash, ...safeShare } = share

  return {
    share: safeShare,
    files: shareFiles
  }
});
