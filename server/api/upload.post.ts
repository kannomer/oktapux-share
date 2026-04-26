import formidable from 'formidable';
import { randomUUID } from 'node:crypto';
import { join, extname } from 'node:path';
import { rename } from 'node:fs/promises';
import { db } from '../db/index';
import { shares, files } from '../db/schema';
import { nanoid } from "nanoid";

export default defineEventHandler(async (event) => {
  const req = event.node.req;

  const form = formidable({
    uploadDir: join(process.cwd(), "uploads"),
    maxFileSize: 500 * 1024 * 1024, // 500MB
    multiples: true
  });

  let uploadFields;
  let uploadFiles;
  try {
    [uploadFields, uploadFiles] = await form.parse(req);
  } catch(err) {
    console.error(err);
    throw createError({ statusCode: 400, message: "Failed to parse upload"});
  }

  // make sure files exist in the request
  if(uploadFiles?.["files"] === undefined || uploadFiles?.["files"].length == 0) {
    console.error("Files doesn't exist in request")
    throw createError({ statusCode: 400, message: "Validation failed. No files exist in request"})
  }

  // Insert a new row into shares table
  const token = nanoid();
  // TODO: Implement expires_at and max_downloads logic
  const [share] = await db.insert(shares).values({
    token,
    expires_at: null,
    max_downloads: 2,
  }).returning();
  if (!share) {
    throw createError({ statusCode: 500, message: "Failed to create share" });
  }

  // Loop through uploaded files:
  for (const file of uploadFiles["files"]) {
    const ext = extname(file.originalFilename ?? "");
    const storedName = randomUUID() + ext;
    await rename(file.filepath, join(process.cwd(), "uploads", storedName))

    await db.insert(files).values({
      share_id: share.id,
      original_name: file.originalFilename ?? "unknown",
      stored_name: storedName,
      size: file.size,
      mime_type: file.mimetype ?? "application/octet-stream"
    })
  }
  return { token };
});
