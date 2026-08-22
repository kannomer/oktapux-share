import { z } from 'zod'

export const expiryTypeSchema = z.enum(['date', 'downloads', 'permanent'])

export const slugSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{3,50}$/, 'The slug should contain only letters, numbers and underscores. 3-50 length')

export const passwordSchema = z.string().min(1, 'Password cannot be empty')

export const expiryDateSchema = z.string().datetime({ offset: true })

export const maxDownloadsSchema = z.coerce.number().int().positive()
