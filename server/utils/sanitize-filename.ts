import { basename } from 'node:path'

// Reduces a (possibly attacker-controlled) filename to a safe entry name
// for the "download as zip" archive. `original_name` comes straight from
// the uploader's multipart request. If it contains directory traversal
// segments (e.g. "../../../../whatever") and is embedded verbatim as the
// zip entry path, an extraction tool that doesn't defend against
// "Zip Slip" could write files outside the folder the recipient meant to
// extract into. Stripping to a bare basename removes any path component,
// on both POSIX and Windows separators, regardless of which platform this
// runs on.
export const sanitizeArchiveEntryName = (name: string): string => {
  const normalized = name.replace(/\\/g, '/')
  const stripped = basename(normalized).replace(/^\.+/, '')
  return stripped || 'file'
}
