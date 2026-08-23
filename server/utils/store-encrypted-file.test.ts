import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

const { insertMock } = vi.hoisted(() => ({ insertMock: vi.fn() }))

vi.mock('../db/index', () => ({ db: { insert: insertMock } }))
vi.mock('../db/schema', () => ({ files: { id: 'id', stored_name: 'stored_name' } }))

const { storeEncryptedFile, removeStoredFiles } = await import('./store-encrypted-file')

const originalSecret = process.env.ENCRYPTION_KEY_SECRET
let tempDir = ''

beforeEach(async () => {
  process.env.ENCRYPTION_KEY_SECRET = '22'.repeat(32)
  tempDir = await mkdtemp(join(tmpdir(), 'oktapux-store-test-'))
  insertMock.mockReset()
  insertMock.mockReturnValue({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [{ id: 7, stored_name: 'stored-file' }]),
    })),
  })
})

afterEach(async () => {
  if (originalSecret === undefined) delete process.env.ENCRYPTION_KEY_SECRET
  else process.env.ENCRYPTION_KEY_SECRET = originalSecret
  await rm(tempDir, { recursive: true, force: true })
})

describe('storeEncryptedFile', () => {
  it('streams and encrypts a multi-megabyte upload before recording it', async () => {
    const source = join(tempDir, 'source.bin')
    const payload = randomBytes(3 * 1024 * 1024)
    await writeFile(source, payload)

    const file = {
      filepath: source,
      originalFilename: 'large.bin',
      size: payload.length,
      mimetype: 'application/octet-stream',
    } as never

    const result = await storeEncryptedFile(file, 42, 'secret123')

    expect(result).toEqual({ id: 7, storedName: 'stored-file' })
    expect(insertMock).toHaveBeenCalledOnce()
    await removeStoredFiles([result])
    await expect(readFile(source)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('removes the encrypted blob when recording the file fails', async () => {
    const source = join(tempDir, 'source.bin')
    await writeFile(source, Buffer.from('cleanup me'))
    insertMock.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(async () => { throw new Error('db failed') }),
      })),
    })

    const file = {
      filepath: source,
      originalFilename: 'cleanup.txt',
      size: 10,
      mimetype: 'text/plain',
    } as never

    await expect(storeEncryptedFile(file, 42, 'secret123')).rejects.toThrow('db failed')
    await expect(readFile(source)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
