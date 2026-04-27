<template>
    <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
        <UCard class="w-full" variant="subtle">
            <template #header>
                <USkeleton v-if="pending" class="h-5 w-62.5" />
                <p v-else-if="errorMessage">An error occured</p>
                <div v-else-if="data">
                    <p class="font-semibold">Share details</p>
                    <p class="text-sm text-muted mt-1">{{ fileData?.length }} file(s) · {{ totalSize }}</p>
                </div>
            </template>
            <div v-if="pending" class="space-y-3">
                <USkeleton class="h-8 w-full" />
                <USkeleton class="h-8 w-full" />
                <USkeleton class="h-8 w-full" />
            </div>
            <div v-else-if="errorMessage" class="text-center py-6">
                <p class="text-muted">{{ errorMessage }}</p>
            </div>
            <div v-else-if="data">
                <!-- Table header -->
                <div class="grid grid-cols-[1fr_120px_120px] border-b pb-2 mb-1">
                    <span class="text-sm font-semibold">Name</span>
                    <span class="text-sm font-semibold">Size</span>
                    <span class="text-sm font-semibold text-right">Actions</span>
                </div>
                <!-- File rows -->
                <div
                    v-for="file in fileData"
                    :key="file.id"
                    class="grid grid-cols-[1fr_120px_120px] items-center py-2 border-b last:border-0"
                >
                    <span class="text-sm truncate pr-4">{{ file.original_name }}</span>
                    <span class="text-sm text-muted">{{ formatSize(file.size) }}</span>
                    <div class="flex justify-end gap-2">
                        <UButton
                            icon="i-lucide-link"
                            variant="ghost"
                            color="neutral"
                            size="sm"
                            @click="copyToClipboard(fileDownloadUrl(file.id))"
                        />
                        <UButton
                            icon="i-lucide-download"
                            variant="ghost"
                            color="neutral"
                            size="sm"
                            :to="`/api/files/${file.id}`"
                            target="_blank"
                        />
                    </div>
                </div>
            </div>
            <template #footer>
                <USkeleton v-if="pending" class="h-5 w-62.5" />
                <p v-else-if="expiresAt" class="text-sm text-muted">Expires on {{ expiresAt }}</p>
                <p v-else-if="shareData?.max_downloads" class="text-sm text-muted">
                    {{ shareData.download_count }} of {{ shareData.max_downloads }} downloads used
                </p>
                <p v-else class="text-sm text-muted">This share never expires</p>
            </template>
        </UCard>
    </UContainer>
</template>

<script setup lang="ts">
    const token = useRoute().params.token

    const { data, error, pending, execute } = await useFetch(`/api/shares/${token}`)
    const errorMessage = computed(() => {
        if(!error.value) return null
        if(error.value.statusCode == 404) return "Share not found"
        if(error.value.statusCode == 410) return "This share has expired"
        return "Something went wrong"
    })
    const shareData = computed(() => data.value?.share)
    const fileData = computed(() => data.value?.files)
    const fileUrl = computed(() => {
        if(import.meta.client){
            return `${window.location.origin}/s/${token}`
        }
        return ""
    })

    const expiresAt = computed(() => 
        shareData.value?.expires_at 
        ? new Date(shareData.value.expires_at).toLocaleString()
        : null
    )

    const fileDownloadUrl = (fileId: number) => {
        if (import.meta.client) return `${window.location.origin}/api/files/${fileId}`
        return ''
    }

    const { copyToClipboard } = useCopyToClipboard()

    const formatSize = (bytes: number) => {
        if(bytes < 1024) return `${bytes}B`
        if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
        if(bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
    }
    const totalSize = computed(() => {
        const total = fileData.value?.reduce((sum, file) => sum + file.size, 0) ?? 0
        return formatSize(total)
    })
</script>
