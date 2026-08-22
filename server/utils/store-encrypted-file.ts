import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { createReadStream, createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import type { File as FormidableFile } from 'formidable'
import { db } from '../db/index'
import { files } from '../db/schema'
import { createEncryptCipher, deriveFileKey, generateSalt } from './encryption'

export type StoredFile = {
  id: number
  storedName: string
}

// Encrypts one uploaded file while streaming it from formidable's temp path
// into its final location in uploads/, and records it in the files table.
// Shared by the normal and reverse upload paths.
export const storeEncryptedFile = async (
  file: FormidableFile,
  shareId: number,
  password?: string,
): Promise<StoredFile> => {
  const storedName = randomUUID()
  const destPath = join(process.cwd(), 'uploads', storedName)
  const salt = generateSalt()
  const key = deriveFileKey(salt, password)
  const { iv, cipher } = createEncryptCipher(key)
  try {
    await pipeline(
      createReadStream(file.filepath),
      cipher,
      createWriteStream(destPath),
    )
    const authTag = cipher.getAuthTag()

    await unlink(file.filepath).catch(() => undefined)

    const [record] = await db.insert(files).values({
      share_id: shareId,
      original_name: file.originalFilename ?? 'unknown',
      stored_name: storedName,
      size: file.size,
      mime_type: file.mimetype ?? 'application/octet-stream',
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      auth_tag: authTag.toString('hex'),
    }).returning({ id: files.id, stored_name: files.stored_name })

    if (!record) throw new Error('Failed to record encrypted file')

    return { id: record.id, storedName: record.stored_name }
  } catch (error) {
    await unlink(destPath).catch(() => undefined)
    await unlink(file.filepath).catch(() => undefined)
    throw error
  }
}

export const removeStoredFiles = async (storedFiles: StoredFile[]): Promise<void> => {
  await Promise.all(storedFiles.map(({ storedName }) =>
    unlink(join(process.cwd(), 'uploads', storedName)).catch(() => undefined),
  ))
}
