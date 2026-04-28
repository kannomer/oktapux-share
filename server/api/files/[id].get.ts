import { db } from '../../db/index';
import { shares, files } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { createReadStream } from 'node:fs';

export default defineEventHandler(async (event) => {
  // Get the file id from the URL params
  const rawId = getRouterParam(event, "id")
  if (!rawId) throw createError({ statusCode: 400, message: "Missing file ID" });
  const fileId = parseInt(rawId);
  if (isNaN(fileId)) throw createError({ statusCode: 400, message: "Invalid file ID" });

  // Query the files table for the file with that id
  const [file] = await db.select().from(files).where(eq(files.id, fileId));
  if(!file) throw createError({ statusCode: 404, message: "File not found" });

  // Query the shares table to get the parent share
  const [share] = await db.select().from(shares).where(eq(shares.id, file.share_id));
  if(!share) throw createError({ statusCode: 404, message: "Share not found"});

  // Check if the share is expired (same logic as [token].get.ts)
  if(share.expires_at && new Date() > share.expires_at) {
    throw createError({ statusCode: 410, message: "Share has expired" });
  }
  if(share.max_downloads && share.download_count >= share.max_downloads) {
    throw createError({ statusCode: 410, message: "Share has expired" });
  }

  // Set the response headers
  setResponseHeader(event, "Content-Disposition", `attachment; filename="${file.original_name}"`);
  setResponseHeader(event, "Content-Type", file.mime_type)

  // Stream the file from uploads/ back to the client
  const stream = createReadStream(join(process.cwd(), "uploads", file.stored_name));
  // Increment download_count on the share by 1
  await db.update(shares).set({ download_count: share.download_count+1}).where(eq(shares.id, share.id));
  return sendStream(event, stream)
});
