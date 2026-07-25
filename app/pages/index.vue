<template>
  <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
    <!-- File upload card -->
    <UCard :title="config?.site_name || 'Create a share'" description="Share your files across the globe" class="w-full" variant="subtle">
      <UFileUpload
        multiple
        icon="i-lucide-cloud-upload"
        label="Select or drop your files here" 
        :description="`(Max. ${formatSize(config?.max_file_size ?? 0)})`"
        layout="list"
        :interactive="true"
        v-model="fileUploadValue" 
        class="w-full min-h-48"
        color="neutral"
      />
      
      <div class="flex justify-center mt-6">
        <UButton type="button" label="Share" icon="i-lucide-share" @click="openExpirationModal" color="neutral" size="xl"/>
      </div>
    </UCard>
    
    <UModal v-model:open="isModalOpen" title="Create share" description="Set a name, description and expiration">
      <template #body>
        <!-- Expiration type selector -->
        <URadioGroup
          v-model="expiryType"
          :disabled="isPermanent"
          legend="Expires by"
          :items="expiryTypeOptions"
        />

        <!-- Conditional: date input (amount + unit) -->
        <div v-if="expiryType === 'date'" class="flex gap-2 mt-4">
          <UInputNumber :disabled="isPermanent" v-model="expiryAmount" :min="1" class="w-24" />
          <USelect
            v-model="expiryUnit"
            :disabled="isPermanent"
            :items="expiryUnitOptions"
            class="flex-1"
          />
        </div>
        <p v-if="expiryType === 'date'" class="text-xs text-muted mt-1">
          Expires on {{ computedExpiryDisplay }}
        </p>
        <p v-if="expiryType === 'date' && config?.max_expiry_days" class="text-xs text-muted">
          This server caps expiry at {{ config.max_expiry_days }} day{{ config.max_expiry_days === 1 ? '' : 's' }}
        </p>

        <!-- Conditional: download count input -->
        <p v-if="expiryType === 'downloads'" class="text-sm text-muted mt-4 mb-1">Max downloads</p>
        <UInputNumber
          v-if="expiryType === 'downloads'"
          :disabled="isPermanent"
          v-model="maxDownloads"
          :min="1"
        />
        <p v-if="expiryType === 'downloads' && config?.cap_download_based_expiry && config?.max_expiry_days" class="text-xs text-muted mt-1">
          This server also expires download-based shares after {{ config.max_expiry_days }} day{{ config.max_expiry_days === 1 ? '' : 's' }}, whichever comes first
        </p>
        <USwitch v-if="config?.allow_permanent_shares" v-model="isPermanent" label="Permanent share" class="mt-4" />
        <USeparator type="dashed" class="mt-5"/>
        <!-- Share naming -->
        <div class="flex flex-col gap-2 mt-4">
          <UInput v-model="shareName" placeholder="Share name (optional)"/>
          <UTextarea v-model="shareDescription" placeholder="Share description (optional)" autoresize :maxrows="4"/>
          <UInput
            v-model="sharePassword"
            type="password"
            :placeholder="config?.allow_passwordless_shares === false ? 'Password (required)' : 'Password (optional)'"
            icon="i-lucide-lock"
          />
          <p v-if="config?.allow_passwordless_shares === false" class="text-xs text-muted">
            This server requires a password on every share
          </p>
        </div>
      </template>


      <template #footer>
        <UButton label="Upload" size="lg" icon="i-lucide-upload" @click="attemptSubmit" loading-auto :disabled="isLoading" loading-icon="i-lucide-loader" />
      </template>
    </UModal>

    <!-- Display share link -->
    <UModal v-model:open="isShareModalOpen" title="Your share is ready">
      <template #body class="block justify-center">
        <p class="font-semibold">Here's your share link:</p>
        <UInput :model-value="shareUrl ?? ''" readonly class="w-full mt-2"/>
        <p v-if="submittedInfo?.expiryType === 'downloads'" class="text-xs text-muted mt-2">
          Expires after {{ submittedInfo?.maxDownloads }} downloads
        </p>
        <p v-if="submittedInfo?.expiryType === 'date'" class="text-xs text-muted mt-2">
          Expires on {{ new Date(submittedInfo?.expiryDate ?? "").toLocaleString() }}
        </p>
        <p v-if="submittedInfo?.expiryType === 'permanent'" class="text-xs text-muted mt-2">
          This share never expires
        </p>
        <p v-if="submittedInfo?.isPasswordProtected" class="text-xs text-muted mt-2">
          Password protected
        </p>
      </template>
      <template #footer>
        <UButton icon="i-lucide-clipboard-pen" label="Copy to clipboard" size="lg" variant="solid" @click="copyToClipboard(shareUrl ?? '')"/>
        <UButton v-if="config?.enable_qr_code && qrCodeUrl" icon="i-lucide-qr-code" label="Share QR Code" size="lg" variant="solid" @click="() => { qrCodeModal = true }"></UButton>
      </template>
    </UModal>
    <!-- QR Code Modal -->
     <UModal v-model:open="qrCodeModal" v-if="config?.enable_qr_code && qrCodeUrl" title="Your QR Code is created">
      <template #body class="block justify-center">
        <img :src="qrCodeUrl" class="mt-4 mx-auto"/>
      </template>
      <template #footer>
        <UButton icon="i-lucide-download" label="Download QR Code" size="lg" variant="solid" :href="qrCodeUrl" download="share-qr.png"/>
      </template>
     </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

// Server-side config — controls which upload options are shown/allowed.
// The frontend only uses this for UX (hiding/disabling fields); the real
// enforcement happens server-side in /api/upload.
const { data: config } = await useSiteConfig()
const formatSize = useFormatSize()

useHead({
  title: config.value?.site_name || 'Oktapux Share'
})

const fileUploadValue = ref<File[]>([])
const isModalOpen = ref(false)
const expiryType = ref<"date" | "downloads">("date")
const isPermanent = ref(false)
const expiryAmount = ref(1)
const expiryUnit = ref("day")
const shareName = ref<string>("")
const shareDescription = ref<string>("")
const sharePassword = ref<string>("")

// Expiration options
const expiryUnitOptions = [
  { label: 'Minute(s)', value: 'minute' },
  { label: 'Hour(s)', value: 'hour' },
  { label: 'Day(s)', value: 'day' },
  { label: 'Week(s)', value: 'week' },
  { label: 'Month(s)', value: 'month' },
  { label: 'Year(s)', value: 'year' }
]
const expiryTypeOptions = [
  { label: 'Date', value: 'date' },
  { label: 'Download count', value: 'downloads' }
]
const { computedExpiryDate } = useComputeExpiryDate(expiryAmount, expiryUnit)
const computedExpiryDisplay = computed(() => new Date(computedExpiryDate.value).toLocaleString())
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

const { handleSubmit, isLoading, shareUrl, isShareModalOpen, submittedInfo } = useHandleSubmit({
  files: fileUploadValue,
  isPermanent,
  expiryType,
  expiryAmount,
  expiryUnit,
  maxDownloads,
  computedExpiryDate,
  shareName,
  shareDescription,
  sharePassword
})

const { copyToClipboard } = useCopyToClipboard()

// Client-side check before submitting — mirrors the server-side rule in
// /api/upload so the user gets instant feedback instead of a round-trip
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
