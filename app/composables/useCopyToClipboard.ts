export default function(){
    const toast = useToast()

    const copyToClipboard = async (text?: string | null) => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            toast.add({ title: "Copied share link to clipboard", icon: "i-lucide-clipboard-check", color: "success" })
        } catch {
            toast.add({ title: "Copy failed", color: "error" })
        }
    }
    return { copyToClipboard }
}