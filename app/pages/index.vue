<template>
  <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
    <!-- File upload card -->
    <UCard title="Create a share" description="Share your files across the globe" class="w-full" variant="subtle">
      <UFileUpload
        multiple
        icon="i-lucide-cloud-upload"
        label="Select or drop your files here" 
        description="(Max. 500MB)"
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

        <!-- Conditional: download count input -->
        <p v-if="expiryType === 'downloads'" class="text-sm text-muted mt-4 mb-1">Max downloads</p>
        <UInputNumber
          v-if="expiryType === 'downloads'"
          :disabled="isPermanent"
          v-model="maxDownloads"
          :min="1"
        />
        <USwitch v-model="isPermanent" label="Permanent share" class="mt-4" />
        <USeparator type="dashed" class="mt-5"/>
        <!-- Share naming -->
        <div class="flex flex-col gap-2 mt-4">
          <UInput v-model="shareName" placeholder="Share name (optional)"/>
          <UTextarea v-model="shareDescription" placeholder="Share description (optional)" autoresize :maxrows="4"/>
        </div>
      </template>


      <template #footer>
        <UButton label="Upload" size="lg" icon="i-lucide-upload" @click="handleSubmit(() => isModalOpen = false)" loading-auto :disabled="isLoading" loading-icon="i-lucide-loader" />
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
      </template>
      <template #footer>
        <UButton icon="i-lucide-clipboard-pen" label="Copy to clipboard" size="lg" variant="solid" @click="copyToClipboard(shareUrl ?? '')"/>
        <UButton v-if="qrCodeUrl" icon="i-lucide-qr-code" label="Share QR Code" size="lg" variant="solid" @click="qrCodeModal = true"></UButton>
      </template>
    </UModal>
    <!-- QR Code Modal -->
     <UModal v-model:open="qrCodeModal" v-if="qrCodeUrl" title="Your QR Code is created">
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

const fileUploadValue = ref<File[]>([])
const isModalOpen = ref(false)
const expiryType = ref<"date" | "downloads">("date")
const isPermanent = ref(false)
const expiryAmount = ref(1)
const expiryUnit = ref("day")
const shareName = ref<string>("")
const shareDescription = ref<string>("")

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

// check if files are selected
const openExpirationModal = () => {
  if (!fileUploadValue.value?.length) {
    useToast().add({ title: "No files selected", description: "Please select files to upload", color: "warning"})
    return;
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
  shareDescription
})

const { copyToClipboard } = useCopyToClipboard()

// QR Code
const qrCodeUrl = ref<string | null>(null)
const qrCodeModal = ref(false)
watch(isShareModalOpen, async (isOpen) => {
  if(isOpen && shareUrl.value){
    qrCodeUrl.value = await QRCode.toDataURL(shareUrl.value)
  }
})
</script>
