export default function(token: string, password?: Ref<string>){
    const shareDownloadUrl = computed(() => {
            if(import.meta.client) {
                const url = `${window.location.origin}/api/shares/${token}/download`
                return password?.value ? `${url}?password=${encodeURIComponent(password.value)}` : url
            }
            return ""
    })
    return shareDownloadUrl
}
