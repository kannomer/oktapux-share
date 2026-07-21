export default function(){
    const fileDownloadUrl = (fileId: number, password?: string) => {
        if (import.meta.client) {
            const url = `${window.location.origin}/api/files/${fileId}`
            return password ? `${url}?password=${encodeURIComponent(password)}` : url
        }
        return ''
    }
    return fileDownloadUrl
}
