export default function(token: string){
    const shareDownloadUrl = computed(() => {
            if(import.meta.client) return `${window.location.origin}/api/shares/${token}/download`
            return ""
    })
    return shareDownloadUrl
}