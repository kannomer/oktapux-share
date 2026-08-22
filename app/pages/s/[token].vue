<template>
    <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
        <UCard v-if="isLocked" class="w-full" variant="subtle">
            <template #header>
                <p class="font-semibold flex items-center gap-2">
                    <UIcon name="i-lucide-lock" />
                    Password required
                </p>
                <p class="text-sm text-muted mt-1">This share is protected. Enter the password to view its files.</p>
            </template>
            <UInput
                v-model="passwordInput"
                type="password"
                placeholder="Password"
                icon="i-lucide-lock"
                class="w-full"
                @keyup.enter="submitPassword"
            />
            <p v-if="hasAttempted" class="text-xs text-error mt-2">Incorrect password. Please try again.</p>
            <template #footer>
                <UButton label="Unlock" icon="i-lucide-unlock" :loading="pending" @click="submitPassword" />
            </template>
        </UCard>

        <UCard v-else class="w-full" variant="subtle">
            <div v-if="shareData?.is_reverse" class="flex items-center justify-between gap-2 mb-4 p-3 rounded-lg bg-elevated">
                <div class="min-w-0">
                    <p class="text-sm font-semibold flex items-center gap-1.5">
                        <UIcon name="i-lucide-inbox" />
                        Share this link to collect files
                    </p>
                    <p class="text-xs text-muted truncate mt-0.5">{{ uploadPageUrl }}</p>
                </div>
                <UButton
                    icon="i-lucide-link"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    @click="copyToClipboard(uploadPageUrl, 'collection link')"
                />
            </div>
            <template #header>
                <USkeleton v-if="pending" class="h-5 w-62.5" />
                <p v-else-if="errorMessage">{{ errorMessage }}</p>
                <div v-else-if="data" class="flex items-center justify-between">
                    <div>
                        <p v-if="shareData?.name" class="font-semibold">{{ shareData.name }}</p>
                        <p v-else class="font-semibold">Share details</p>
                        <p v-if="shareData?.description" class="text-sm text-muted mt-1">{{ shareData.description }}</p>
                        <p class="text-sm text-muted mt-1">{{ fileData?.length === 1 ? '1 file' : `${fileData?.length} files` }} · {{ totalSize }}</p>
                    </div>
                    <div class="flex items-center gap-1">
                        <UTooltip text="Copy share link">
                            <UButton
                                icon="i-lucide-link"
                                variant="ghost"
                                color="neutral"
                                size="sm"
                                @click="copyToClipboard(sharePageUrl)"
                            />
                        </UTooltip>
                        <UTooltip text="Download share as zip">
                            <UButton
                                icon="i-lucide-folder-down"
                                variant="ghost"
                                color="neutral"
                                size="sm"
                                :href="shareDownloadUrl"
                                target="_blank"
                            />
                        </UTooltip>
                    </div>
                </div>
            </template>
            <template v-if="pending">
                <div v-for="i in 3" :key="i" class="grid grid-cols-[1fr_120px_120px] gap-2 py-2">
                    <USkeleton class="h-5" />
                    <USkeleton class="h-5" />
                    <USkeleton class="h-5" />
                </div>
            </template>
            <div v-else-if="data">
                <!-- Table header -->
                <div class="grid grid-cols-[1fr_120px_120px] border-b pb-2 mb-1">
                    <span class="text-sm font-semibold ml-2">Name</span>
                    <span class="text-sm font-semibold">Size</span>
                    <span class="text-sm font-semibold text-right mr-2">Actions</span>
                </div>
                <!-- File rows -->
                <div
                    v-for="file in fileData"
                    :key="file.id"
                    class="grid grid-cols-[1fr_120px_120px] items-center py-2 border-b last:border-0">
                    <span class="text-sm truncate pr-4">{{ file.original_name }}</span>
                    <span class="text-sm text-muted">{{ formatSize(file.size) }}</span>
                    <div class="flex justify-end gap-2">
                        <UTooltip v-if="!shareData?.is_password_protected" text="Copy file link">
                            <UButton
                                icon="i-lucide-link"
                                variant="ghost"
                                color="neutral"
                                size="sm"
                                @click="copyToClipboard(fileDownloadUrl(token, file.id), 'file link')"
                            />
                        </UTooltip>
                        <UTooltip text="Download file">
                            <UButton
                                icon="i-lucide-download"
                                variant="ghost"
                                color="neutral"
                                size="sm"
                                :href="fileDownloadUrl(token, file.id)"
                                target="_blank"
                            />
                        </UTooltip>
                    </div>
                </div>
            </div>
            <template #footer>
                <USkeleton v-if="pending" class="h-5 w-full" />
                <p v-else-if="expiresAt" class="text-sm text-muted">{{ expiresAt }}</p>
                <p v-else-if="shareData?.max_downloads" class="text-sm text-muted">
                    {{ shareData.download_count }} of {{ shareData.max_downloads }} downloads used
                </p>
                <p v-else class="text-sm text-muted">This share never expires</p>
            </template>
        </UCard>
    </UContainer>
</template>

<script setup lang="ts">
    const token = useRoute().params.token as string

    const passwordInput = ref('')
    const hasAttempted = ref(false)

    const { data, error, pending, refresh } = await useFetch(`/api/shares/${token}`, {
        watch: false
    })

    const isLocked = computed(() => error.value?.statusCode === 401)

    const submitPassword = async () => {
        const password = passwordInput.value

        if (!password) return

        hasAttempted.value = false

        try {
            await $fetch(`/api/shares/${token}`, {
                headers: {
                    'x-share-password': password,
                },
            })

            passwordInput.value = ''
            await refresh()
        } catch {
            hasAttempted.value = true
        }
    }

    const errorMessage = computed(() => {
        if (!error.value || isLocked.value) return null
        if (error.value.statusCode == 404) return "Share not found"
        if (error.value.statusCode == 410) return "This share has expired"
        return "Something went wrong"
    })
    const shareData = computed(() => data.value?.share)
    const fileData = computed(() => data.value?.files)

    const expiresAt = computed(() => {
        if (!shareData.value?.expires_at) return null
        const diff = new Date(shareData.value.expires_at).getTime() - Date.now()
        if (diff <= 0) return 'Expired'
        const minutes = Math.floor(diff / 1000 / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        if (days > 0) return `Expires in ${days} day${days === 1 ? '' : 's'}`
        if (hours > 0) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`
        return `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}`
    })

    const sharePageUrl = computed(() => {
        if (import.meta.client) return window.location.href
        return ''
    })

    const uploadPageUrl = computed(() => {
        if (import.meta.client && shareData.value?.upload_token) {
            return `${window.location.origin}/r/${shareData.value.upload_token}`
        }
        return ''
    })

    const fileDownloadUrl = useCreateFileDownloadUrl()
    const shareDownloadUrl = useCreateShareDownloadUrl(token)
    const { copyToClipboard } = useCopyToClipboard()

    const formatSize = useFormatSize()
    const totalSize = computed(() => {
        const total = fileData.value?.reduce((sum, file) => sum + file.size, 0) ?? 0
        return formatSize(total)
    })
</script>
