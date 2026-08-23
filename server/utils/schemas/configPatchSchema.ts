import { z } from 'zod'

export const configPatchSchema = z.object({
  max_file_size: z.number().int().positive(),
  allow_passwordless_shares: z.boolean(),
  allow_permanent_shares: z.boolean(),
  max_expiry_days: z.number().int().positive().nullable(),
  cap_download_based_expiry: z.boolean(),
  enable_qr_code: z.boolean(),
  allow_reverse_shares: z.boolean(),
  site_name: z.string().trim().max(100).nullable(),
}).strict()
