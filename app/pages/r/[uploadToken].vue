<template>
    <UContainer class="flex justify-center pt-8 w-full max-w-2xl">

        <!-- Password unlock -->
        <UCard v-if="isLocked" class="w-full" variant="subtle">
            <template #header>
                <p class="font-semibold flex items-center gap-2">
                    <UIcon name="i-lucide-lock" />
                    Password required
                </p>
                <p class="text-sm text-muted mt-1">This request is protected. Enter the password to continue.</p>
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

        <!-- Main card -->
        <UCard v-else class="w-full" variant="subtle">
            <template #header>
                <USkeleton v-if="pending" class="h-5 w-62.5" />
                <p v-else-if="errorMessage">{{ errorMessage }}</p>
                <div v-else-if="data">
                    <p class="font-semibold">{{ data.name || 'File request' }}</p>
                    <p v-if="data.description" class="text-sm text-muted mt-1">{{ data.description }}</p>
                </div>
            </template>

            <template v-if="pending">
                <USkeleton class="h-32 w-full" />
            </template>

            <div v-else-if="submitted" class="text-center py-6">
                <UIcon name="i-lucide-circle-check" class="text-primary w-10 h-10 mx-auto" />
                <p class="font-semibold mt-3">Thanks, your files were submitted</p>
                <UButton label="Submit more files" variant="ghost" color="neutral" size="sm" class="mt-4" @click="() => { submitted = false }" />
            </div>

            <div v-else-if="data">
                <UFileUpload
				    v-model="fileUploadValue"
                    multiple
                    icon="i-lucide-cloud-upload"
                    label="Select or drop your files here"
                    layout="list"
                    :interactive="true"
                    class="w-full min-h-48"
                    color="neutral"
                />
            </div>

            <template v-if="!pending && !errorMessage && !submitted" #footer>
                <UButton
                    label="Submit"
                    icon="i-lucide-upload"
                    size="lg"
                    color="neutral"
                    :loading="isSubmitting"
                    @click="attemptSubmit"
                />
            </template>
        </UCard>

    </UContainer>
</template>

<script setup lang="ts">
    const uploadToken = useRoute().params.uploadToken as string

    // Passwords are sent only in the request header. A successful unlock
    // establishes a short-lived HttpOnly cookie for subsequent requests.
    const passwordInput = ref('')
    const hasAttempted = ref(false)

    const { data, error, pending, refresh } = await useFetch(`/api/reverse/${uploadToken}`, {
        watch: false
    })

    const isLocked = computed(() => error.value?.status === 401)

    const submitPassword = async () => {
        const password = passwordInput.value

        if (!password) return

        hasAttempted.value = false

        try {
            await $fetch(`/api/reverse/${uploadToken}`, {
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
        if (error.value.status === 404) return "This link doesn't exist"
        if (error.value.status === 410) return "This request has been closed"
        return "Something went wrong"
    })

    const fileUploadValue = ref<File[]>([])
    const isSubmitting = ref(false)
    const submitted = ref(false)

    const toast = useToast()

    const attemptSubmit = async () => {
        if (!fileUploadValue.value?.length) {
            toast.add({ title: "No files selected", description: "Please select files to upload", color: "warning" })
            return
        }

        isSubmitting.value = true

        const formData = new FormData()
        fileUploadValue.value.forEach(file => formData.append('files', file))

        try {
            await $fetch(`/api/reverse/${uploadToken}`, {
                method: 'POST',
                body: formData
            })
            fileUploadValue.value = []
            submitted.value = true
        } catch (err) {
            toast.add({
				title: "Upload failed",
				description: "Please try again later.",
				color: "error"
			})
		console.error(err)
        } finally {
            isSubmitting.value = false
        }
    }
</script>
