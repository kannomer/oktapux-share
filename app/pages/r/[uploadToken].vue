<template>
    <UContainer class="w-full pt-8 px-4 sm:px-6 lg:px-8 font-redaction text-lg text-white">

        <!-- Password unlock -->
		<div v-if="isLocked" class="text-lg">
                <p class="flex items-center gap-2 text-2xl uppercase font-redaction-35">
                    Password required
                </p>
                <p class="text-lg text-white/80 mb-10">This collection is protected. Enter the password to continue.</p>
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
                @keyup.enter="submitPassword"
            />
            <p v-if="hasAttempted" class="text-sm text-error mt-2">Incorrect password. Please try again.</p>
			<div class="flex justify-center">
                <UButton
				label="Unlock"
				size="md"
				icon="i-lucide-unlock"
				:loading="pending"
				color="neutral"
				class="text-base"
				@click="submitPassword" 
				/>
			</div>
        </div>

        <!-- Main card -->
		<div v-else class="text-lg">
            <USkeleton v-if="pending" class="h-5 w-62.5" />
            <p v-else-if="errorMessage">{{ errorMessage }}</p>
            <div v-else-if="data" class="mb-10 text-center">
                <p class="text-2xl uppercase font-redaction-35">{{ data.name || 'File request' }}</p>
               <p v-if="data.description" class="text-hite/80 mt-1">{{ data.description }}</p>
            </div>

            <div v-if="pending">
                <USkeleton class="h-32 w-full" />
            </div>

            <div v-else-if="submitted" class="text-center py-6">
                <p class="text-2xl uppercase font-redaction-35">Your files were submitted.</p>
                <UButton label="Submit more files" color="neutral" size="lg" class="mt-5 text-lg" @click="() => { submitted = false }" />
            </div>

            <div v-else-if="data">
                <UFileUpload
				    v-model="fileUploadValue"
                    multiple
					icon="i-lucide-cloud-upload"
					label="Drop your files here" 
					layout="list"
					:interactive="false"
					class="w-full min-h-100"
					color="neutral"
					highlight
					:ui="{
						label: 'text-2xl',
						description: 'text-xl text-white/65',
						base: 'bg-bg',
						file: 'border-0',
						fileLeadingAvatar: 'bg-transparent',
						fileName: 'text-lg',
						fileSize: 'text-sm',
						avatar: 'bg-transparent'
					}"
				>
				<template #actions="{ open }">
					<UButton
						label="Or select files"
						color="neutral"
						size="xl"
						class="px-10 py-3 text-xl"
						:ui="{
							base: 'border border-border hover:bg-bg hover:text-white focus:bg-bg focus:text-white'
						}"
						@click="open()"
					/>
					</template>

					<template #files-bottom="{ removeFile, files }">
					<UButton
						v-if="files?.length"
						label="Remove all files"
						color="neutral"
						size="xl"
						@click="removeFile()"
					/>
					</template>
				</UFileUpload>
            </div>

            <div v-if="!pending && !errorMessage && !submitted" class="mt-10 flex justify-center">
                <UButton
					v-if="fileUploadValue?.length"
                    label="Submit files"
                    type="button"
					color="neutral"
					icon="i-lucide-upload"
					size="xl"
					class="px-10 py-3 text-xl"
					:ui="{
						base: 'border border-border hover:bg-bg hover:text-white focus:bg-bg focus:text-white'
					}"
                    :loading="isSubmitting"
                    @click="attemptSubmit"
                />
            </div>
        </div>

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
        if (error.value.status === 410) return "This collection has been closed"
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
