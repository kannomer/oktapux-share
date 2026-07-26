import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import type { File as FormidableFile } from 'formidable';
import { db } from '../db/index';
import { files } from '../db/schema';

// Encrypts one uploaded file while streaming it from formidable's temp path
// into its final location in uploads/, and records it in the files table.
// Shared by server/api/upload.post.ts and
// server/api/reverse/[uploadToken].post.ts, since both store files through
// the exact same encryption-at-rest pipeline.
export const storeEncryptedFile = async (file: FormidableFile, shareId: number, password?: string) => {
  const ext = extname(file.originalFilename ?? "");
  const storedName = randomUUID() + ext;
  const destPath = join(process.cwd(), "uploads", storedName)

  const salt = generateSalt()
  const key = deriveFileKey(salt, password)
  const { iv, cipher } = createEncryptCipher(key)

  await pipeline(
    createReadStream(file.filepath),
    cipher,
    createWriteStream(destPath)
  )
  const authTag = cipher.getAuthTag()
  await unlink(file.filepath)

  await db.insert(files).values({
    share_id: shareId,
    original_name: file.originalFilename ?? "unknown",
    stored_name: storedName,
    size: file.size,
    mime_type: file.mimetype ?? "application/octet-stream",
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    auth_tag: authTag.toString('hex')
  })
}
