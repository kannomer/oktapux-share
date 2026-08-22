import { z } from 'zod'
import {
  expiryDateSchema,
  expiryTypeSchema,
  maxDownloadsSchema,
  passwordSchema,
  slugSchema,
} from '../validation'

const optionalField = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    value => value === '' ? undefined : value,
    schema.optional(),
  )

export const uploadRequestSchema = z.object({
  expiry_type: optionalField(expiryTypeSchema),
  expires_at: optionalField(expiryDateSchema),
  max_downloads: optionalField(maxDownloadsSchema),
  password: optionalField(passwordSchema),
  slug: optionalField(slugSchema),
  name: z.string().optional(),
  description: z.string().optional(),
})
