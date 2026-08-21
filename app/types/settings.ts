export interface Settings {
  max_file_size: number
  allow_passwordless_shares: boolean
  allow_permanent_shares: boolean
  max_expiry_days: number | null
  cap_download_based_expiry: boolean
  enable_qr_code: boolean
  allow_reverse_shares: boolean
  site_name: string | null
}