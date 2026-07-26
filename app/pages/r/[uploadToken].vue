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
                <UButton label="Unlock" icon="i-lucide-unlock" @click="submitPassword" :loading="pending" />
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
                    multiple
                    icon="i-lucide-cloud-upload"
                    label="Select or drop your files here"
                    layout="list"
                    :interactive="true"
                    v-model="fileUploadValue"
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

    // passwordAttempt drives the query param sent to the GET endpoint,
    // the server verifies the password before returning anything,
    // so nothing is revealed until it's correct.
    const passwordAttempt = ref<string>('')
    const passwordInput = ref<string>('')
    const hasAttempted = ref(false)

    const { data, error, pending, refresh } = await useFetch(`/api/reverse/${uploadToken}`, {
        query: { password: passwordAttempt },
        watch: false
    })

    const isLocked = computed(() => error.value?.status === 401)

    const submitPassword = async () => {
        passwordAttempt.value = passwordInput.value
        await refresh()
        hasAttempted.value = isLocked.value
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
            // passwordAttempt is already the verified correct password at this point,
            // since the GET above confirmed it
            const query = passwordAttempt.value ? `?password=${encodeURIComponent(passwordAttempt.value)}` : ''
            await $fetch(`/api/reverse/${uploadToken}${query}`, {
                method: 'POST',
                body: formData
            })
            fileUploadValue.value = []
            submitted.value = true
        } catch (err: any) {
            toast.add({ title: "Upload failed", description: "Please try again later.", color: "error" })
            console.error(err)
        } finally {
            isSubmitting.value = false
        }
    }
</script>
