export default function(){
    const fileDownloadUrl = (fileId: number) => {
        if (import.meta.client) return `${window.location.origin}/api/files/${fileId}`
        return ''
    }
    return fileDownloadUrl
}