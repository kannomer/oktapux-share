export default defineNitroPlugin(() => {
  const secret = process.env.ENCRYPTION_KEY_SECRET

  if (!secret) {
    throw new Error(
      '[oktapux-share] ENCRYPTION_KEY_SECRET env var is not set. ' +
      'Generate one with `openssl rand -hex 32` and set it before starting the server.'
    )
  }

  if (!/^[0-9a-f]{64}$/i.test(secret)) {
    throw new Error(
      '[oktapux-share] ENCRYPTION_KEY_SECRET must be a 64-character hex string (32 bytes). ' +
      'Generate one with `openssl rand -hex 32`.'
    )
  }
})
