<template>
    <UContainer class="w-full pt-8 px-4 sm:px-6 lg:px-8 font-redaction text-lg text-white">
        <div v-if="isLocked">
            <p class="flex items-center gap-2 text-2xl font-redaction-35 uppercase">
                Password required
            </p>
            <p class="text-lg text-white/80 mb-10">This crate is protected. Enter the password to view its files.</p>
			<UInput
				v-model="passwordInput"
				type="password"
				placeholder="Password"
				icon="i-lucide-lock"
				color="neutral"
				class="w-full mb-5"
				:ui="{
					base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
					leadingIcon: 'text-white/35'
  				}"
				@keyup.enter="submitPassword" />
			<p v-if="hasAttempted" class="text-sm text-error mt-2">Incorrect password. Please try again.</p>
			<div class="flex justify-center">
				<UButton
				label="Unlock"
				size="md"
				icon="i-lucide-unlock"
				:loading="pending"
				color="neutral"
				class="text-base"
				@click="submitPassword" />
			</div>
        </div>

		<div v-else>
            <div v-if="shareData?.is_reverse">
				<div class="flex items-center justify-between gap-2 mb-4 rounded-lg">
					<div class="min-w-0">
						<p class="text-lg flex items-center gap-1.5">
							<UIcon name="i-lucide-inbox" />
							Share this link to collect files
						</p>
						<p class="text-sm text-white/60 truncate">{{ uploadPageUrl }}</p>
					</div>
					<UButton
						icon="i-lucide-link"
						variant="ghost"
						color="neutral"
						size="md"
						@click="copyToClipboard(uploadPageUrl, 'collection link')"
					/>
				</div>
				<USeparator class="mt-5 mb-5" />
            </div>
            <USkeleton v-if="pending" class="h-5 w-62.5" />
            <p v-else-if="errorMessage">{{ errorMessage }}</p>
            <div v-else-if="data" class="flex items-center justify-between">
                <div class="text-lg text-white">
                    <p v-if="shareData?.name">{{ shareData.name }}</p>
                    <p v-else class="text-2xl font-redaction-35 uppercase">Crate details</p>
                    <p v-if="shareData?.description" class=" text-white/80 mt-2">{{ shareData.description }}</p>
                    <p class=" text-white/80 mb-5">{{ fileData?.length === 1 ? '1 file' : `${fileData?.length} files` }} · {{ totalSize }}</p>
                </div>
                <div class="flex items-center gap-1">
                    <UTooltip text="Copy crate link">
                        <UButton
                            icon="i-lucide-link"
                            color="neutral"
                            size="lg"
                            @click="copyToClipboard(sharePageUrl)"
                        />
                    </UTooltip>
                    <UTooltip text="Download crate as zip">
                        <UButton
                            icon="i-lucide-folder-down"
                            color="neutral"
                            size="lg"
                            :href="shareDownloadUrl"
                            target="_blank"
                        />
                    </UTooltip>
                </div>
            </div>
			<div v-if="pending">
                <div v-for="i in 3" :key="i" class="grid grid-cols-[1fr_120px_120px] gap-2 py-2">
                    <USkeleton class="h-5" />
                    <USkeleton class="h-5" />
                    <USkeleton class="h-5" />
                </div>
            </div>
            <div v-else-if="data">
                <!-- Table header -->
                <div class="grid grid-cols-[1fr_120px_120px] border-b pb-2 mb-1 text-xl">
                    <span>Name</span>
                    <span>Size</span>
                    <span class="text-right mr-2">Actions</span>
                </div>
                <!-- File rows -->
                <div
                    v-for="file in fileData"
                    :key="file.id"
                    class="grid grid-cols-[1fr_120px_120px] items-center py-2 border-b last:border-0 text-base">
                    <span class="truncate pr-4">{{ file.original_name }}</span>
                    <span class="text-white/80">{{ formatSize(file.size) }}</span>
                    <div class="flex justify-end gap-2">
                        <UTooltip v-if="!shareData?.is_password_protected" text="Copy file link">
                            <UButton
                                icon="i-lucide-link"
                                variant="ghost"
                                color="neutral"
                                size="lg"
                                @click="copyToClipboard(fileDownloadUrl(token, file.id), 'file link')"
                            />
                        </UTooltip>
                        <UTooltip text="Download file">
                            <UButton
                                icon="i-lucide-download"
                                variant="ghost"
                                color="neutral"
                                size="lg"
                                :href="fileDownloadUrl(token, file.id)"
                                target="_blank"
                            />
                        </UTooltip>
                    </div>
                </div>
            </div>
                <USkeleton v-if="pending" class="h-5 w-full" />
                <p v-else-if="expiresAt" class="text-base text-white/60">{{ expiresAt }}</p>
                <p v-else-if="shareData?.max_downloads" class="text-base text-white/60">
                    {{ shareData.download_count }} of {{ shareData.max_downloads }} downloads used
                </p>
                <p v-else class="text-base text-white/60">This crate never expires</p>
        </div>
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
        if (error.value.statusCode == 404) return "Crate not found"
        if (error.value.statusCode == 410) return "This crate has expired"
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
