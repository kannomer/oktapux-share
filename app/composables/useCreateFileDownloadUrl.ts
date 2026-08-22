export default function () {
  // Passwords are never embedded in URLs. Protected downloads authenticate via
  // the short-lived HttpOnly share-auth cookie established after unlock.
  const fileDownloadUrl = (token: string, fileId: number) => {
    if (import.meta.client) {
      return `${window.location.origin}/api/shares/${token}/files/${fileId}`
    }
    return ''
  }
  return fileDownloadUrl
}
