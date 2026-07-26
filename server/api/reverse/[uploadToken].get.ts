import { db } from '../../db/index';
import { shares } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Public, unauthenticated endpoint the /r/[uploadToken] submission page calls
// before showing its upload form. Deliberately returns the bare minimum.
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

  // returns the plaintext password if correct,
  // throws 401 if missing or wrong.
  await verifySharePassword(event, share.password_hash)

  return {
    name: share.name,
    description: share.description,
    is_password_protected: !!share.password_hash
  }
});
