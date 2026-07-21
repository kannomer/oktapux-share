// Builds a Content-Disposition header value that's safe for any filename,
// including ones with non-ASCII characters or quotes. Raw HTTP headers only
// allow ASCII, so we provide an ASCII-safe fallback via `filename=` and the
// real UTF-8 name via the RFC 5987 `filename*=` parameter, which modern
// browsers prefer.
export const buildContentDisposition = (filename: string, disposition: string = 'attachment'): string => {
  const asciiFallback = filename
    .replace(/[^\x20-\x7E]/g, '_') // strip non-ASCII
    .replace(/"/g, "'")            // quotes would break the quoted string

  const encoded = encodeURIComponent(filename)

  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
}
