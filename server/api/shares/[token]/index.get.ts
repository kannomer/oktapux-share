import { db } from '../../../db/index';
import { shares, files } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  // Get the token from the URL params
  const token = getRouterParam(event, "token");
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' });

  // Query the Crates table
  const [share] = await db.select().from(shares).where(eq(shares.token, token))
  if(!share) throw createError({ statusCode: 404, message: "Crate not found" })

  // Check if the Crate is expired
  if(share.expires_at && new Date() > share.expires_at) {
    throw createError({ statusCode: 410, message: "Crate has expired" })
  }
  if(share.max_downloads && share.download_count >= share.max_downloads) {
    throw createError({ statusCode: 410, message: "Crate has expired" })
  }

  // Check password protection
  await verifySharePassword(event, share.password_hash, share.token, share.expires_at)

  // Query the files table for all files belonging to this Crate
  const shareFiles = await db.select().from(files).where(eq(files.share_id, share.id))

  const { password_hash, ...safeShare } = share

  const safeFiles = shareFiles.map(({ iv, salt, auth_tag, ...rest }) => rest)

  return {
    share: { ...safeShare, is_password_protected: !!share.password_hash },
    files: safeFiles
  }
});
