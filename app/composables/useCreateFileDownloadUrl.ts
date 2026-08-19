export default function(){
    // file downloads are scoped to their parent share and
    // can't be reached with the id alone from this version.
    const fileDownloadUrl = (token: string, fileId: number, password?: string) => {
        if (import.meta.client) {
            const url = `${window.location.origin}/api/shares/${token}/files/${fileId}`
            return password ? `${url}?password=${encodeURIComponent(password)}` : url
        }
        return ''
    }
    return fileDownloadUrl
}
