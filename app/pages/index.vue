<template>
  <UContainer class="w-full pt-8 px-4 sm:px-6 lg:px-8 font-redaction text-lg">
    <!-- File upload card -->
    <div class="w-full">
		<div class="mb-8 text-center">
			<h1 class="font-redaction-35 text-4xl uppercase tracking-tight text-white">
				Create a share
			</h1>
			<p class="mt-2 text-xl text-white/80">
			Share your files across the globe.
			</p>
		</div>
      <UFileUpload
	    v-model="fileUploadValue"
        multiple
		icon="i-lucide-cloud-upload"
        label="Drop your files here" 
        :description="`(Max. ${formatSize(config?.max_file_size ?? 0)})`"
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
	  <div class="flex justify-center mt-6 gap-2">
        <UButton
		v-if="fileUploadValue?.length"
		type="button"
		label="Share"
		icon="i-lucide-share"
		color="neutral"
		size="xl"
		class="px-10 py-3 text-xl"
		@click="openExpirationModal"/>
      </div>
	</div>
      
    <ShareExpirationModal
      v-model:open="isModalOpen"
      v-model:expiry-type="expiryType"
      v-model:is-permanent="isPermanent"
      v-model:expiry-amount="expiryAmount"
      v-model:expiry-unit="expiryUnit"
      v-model:max-downloads="maxDownloads"
      v-model:share-name="shareName"
      v-model:share-description="shareDescription"
      v-model:share-secret-input="sharePassword"
      v-model:share-slug="shareSlug"
      :config="config"
      @submit="attemptSubmit"
    />

    <!-- Display share link -->
    <UModal v-model:open="isShareModalOpen" title="Your share is ready" :ui="{ title: 'text-xl'}">
      <template #body>
		<div class="block justify-center">
			<p class="text-lg">Here's your share link:</p>
			<UInput :model-value="shareUrl ?? ''" readonly class="w-full mt-2"/>
			<p v-if="submittedInfo?.expiryType === 'downloads'" class="text-sm text-muted mt-2">
			Expires after {{ submittedInfo?.maxDownloads }} downloads
			</p>
			<p v-if="submittedInfo?.expiryType === 'date'" class="text-sm text-muted mt-2">
			Expires on {{ new Date(submittedInfo?.expiryDate ?? "").toLocaleString() }}
			</p>
			<p v-if="submittedInfo?.expiryType === 'permanent'" class="text-sm text-muted mt-2">
			This share never expires
			</p>
			<p v-if="submittedInfo?.isPasswordProtected" class="text-sm text-muted mt-2">
			Password protected
			</p>
	  	</div>
      </template>
      <template #footer>
        <UButton icon="i-lucide-clipboard-pen" label="Copy to clipboard" size="lg" variant="solid" @click="copyToClipboard(shareUrl ?? '')"/>
        <UButton v-if="config?.enable_qr_code && qrCodeUrl" icon="i-lucide-qr-code" label="Share QR Code" size="lg" variant="solid" @click="() => { qrCodeModal = true }" />
      </template>
    </UModal>
    <ShareQrModal
      v-model:open="qrCodeModal"
      :qr-code-url="qrCodeUrl"
    />
  </UContainer>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

// Server-side config; controls which upload options are shown/allowed.
// The frontend only uses this for UX (hiding/disabling fields); the real
// enforcement happens server-side in /api/upload.
const { data: config } = await useSiteConfig()
const formatSize = useFormatSize()

const fileUploadValue = ref<File[]>([])
const isModalOpen = ref(false)
const expiryType = ref<"date" | "downloads">("date")
const isPermanent = ref(false)
const expiryAmount = ref(1)
const expiryUnit = ref("day")
const shareName = ref<string>("")
const shareDescription = ref<string>("")
const sharePassword = ref<string>("")
const shareSlug = ref<string>("")

const { computedExpiryDate } = useComputeExpiryDate(expiryAmount, expiryUnit)
const maxDownloads = ref<number>(1)

// check if files are selected, and that none exceed this server's max size
const openExpirationModal = () => {
  if (!fileUploadValue.value?.length) {
    useToast().add({ title: "No files selected", description: "Please select files to upload", color: "warning"})
    return;
  }

  const maxSize = config.value?.max_file_size
  if (maxSize) {
    const oversizedFile = fileUploadValue.value.find(file => file.size > maxSize)
    if (oversizedFile) {
      useToast().add({
        title: "File too large",
        description: `"${oversizedFile.name}" exceeds the maximum allowed size of ${formatSize(maxSize)}`,
        color: "error"
      })
      return;
    }
  }

  isModalOpen.value = true
}

const { handleSubmit, shareUrl, isShareModalOpen, submittedInfo } = useHandleSubmit({
  files: fileUploadValue,
  isPermanent,
  expiryType,
  expiryAmount,
  expiryUnit,
  maxDownloads,
  computedExpiryDate,
  shareName,
  shareDescription,
  sharePassword,
  shareSlug
})

const { copyToClipboard } = useCopyToClipboard()

// Client-side check before submitting
// mirrors the server-side rule in /api/upload so the user
// gets instant feedback instead of a round-trip
// error, but this is UX only; the server re-checks independently.
const attemptSubmit = () => {
  if (config.value?.allow_passwordless_shares === false && !sharePassword.value) {
    useToast().add({ title: "Password required", description: "This server requires a password on every share", color: "warning" })
    return
  }
  handleSubmit(() => isModalOpen.value = false)
}

// QR Code
const qrCodeUrl = ref<string | null>(null)
const qrCodeModal = ref(false)
watch(isShareModalOpen, async (isOpen) => {
  if(isOpen && shareUrl.value && config.value?.enable_qr_code){
    qrCodeUrl.value = await QRCode.toDataURL(shareUrl.value)
  }
})
</script>
