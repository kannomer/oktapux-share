<template>
  <UContainer class="flex justify-center pt-8">
    <div class="w-full max-w-2xl">
      <div>
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
        
        <UModal v-model:open="isModalOpen" title="Set Expiration" description="Choose how this share expires">
          <template #body>
            <!-- Expiration type selector -->
            <URadioGroup
              v-model="expiryType"
              :disabled="isPermanent"
              legend="Expires by"
              :items="[
                { label: 'Date', value: 'date' },
                { label: 'Download count', value: 'downloads' }
              ]"
            />

            <!-- Conditional: date input (amount + unit) -->
            <div v-if="expiryType === 'date'" class="flex gap-2 mt-4">
              <UInputNumber :disabled="isPermanent" v-model="expiryAmount" :min="1" class="w-24" />
              <USelect
                v-model="expiryUnit"
                :disabled="isPermanent"
                :items="[
                  { label: 'Minute(s)', value: 'minute' },
                  { label: 'Hour(s)', value: 'hour' },
                  { label: 'Day(s)', value: 'day' },
                  { label: 'Week(s)', value: 'week' },
                  { label: 'Month(s)', value: 'month' },
                  { label: 'Year(s)', value: 'year' }
                ]"
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
            <USeparator type="dashed" class="mt-5"/>
            <USwitch v-model="isPermanent" label="Permanent share" class="mt-4" />
          </template>


          <template #footer>
            <UButton label="Cancel" size="xl" color="neutral" variant="outline" @click="isModalOpen = false" />
            <UButton label="Upload" size="lg" icon="i-lucide-upload" @click="handleSubmit" loading-auto :disabled="isLoading" loading-icon="i-lucide-loader" />
          </template>
        </UModal>

        <!-- Display share link -->
        <UModal v-model:open="isShareModalOpen" title="Your share is ready">
          <template #body class="block justify-center">
            <p class="font-semibold">Here's your share link:</p>
            <UInput :model-value="shareUrl ?? ''" readonly class="w-full mt-2"/>
            <p v-if="submittedExpiryType === 'downloads'" class="text-xs text-muted mt-2">
              Expires after {{ submittedMaxDownloads }} downloads
            </p>
            <p v-if="submittedExpiryType === 'date'" class="text-xs text-muted mt-2">
              Expires on {{ new Date(submittedExpiryDate!).toLocaleString() }}
            </p>
            <p v-if="submittedExpiryType === 'permanent'" class="text-xs text-muted mt-2">
              This share never expires
            </p>
          </template>
          <template #footer>
            <UButton label="Close" color="neutral" size="xl" variant="outline" @click="isShareModalOpen = false" />
            <UButton icon="i-lucide-clipboard-pen" label="Copy to clipboard" size="lg" variant="solid" @click="copyToClipboard(shareUrl ?? '')"/>
          </template>
        </UModal>
        <!-- TODO: keep QR Code in mind -->
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const fileUploadValue = ref<File[]>([])
const isModalOpen = ref(false)
const isShareModalOpen = ref(false)
const expiryType = ref<'date' | 'downloads' | "permanent">('date')
const isPermanent = ref(false)
const expiryAmount = ref(1)
const expiryUnit = ref('day')
const toast = useToast()

// Expiration options
const computedExpiryDate = computed(() => {
  const now = new Date()
  const amount = expiryAmount.value
  switch (expiryUnit.value) {
    case 'minute': now.setMinutes(now.getMinutes() + amount); break
    case 'hour':   now.setHours(now.getHours() + amount); break
    case 'day':    now.setDate(now.getDate() + amount); break
    case 'week':   now.setDate(now.getDate() + amount * 7); break
    case 'month':  now.setMonth(now.getMonth() + amount); break
    case 'year':   now.setFullYear(now.getFullYear() + amount); break
  }
  return now.toISOString()
})
const computedExpiryDisplay = computed(() => new Date(computedExpiryDate.value).toLocaleString())
const maxDownloads = ref<number>(1)

// check if files are selected
const openExpirationModal = () => {
  if (!fileUploadValue.value?.length) {
    toast.add({ title: "No files selected", description: "Please select files to upload", color: "warning"})
    return;
  }
  isModalOpen.value = true
}

const isLoading = ref(false)
const shareUrl = ref<string | null>(null)
const submittedExpiryType = ref<string | null>(null)
const submittedMaxDownloads = ref<number | null>(null)
const submittedExpiryDate = ref<string | null>(null)
const handleSubmit = async () => {
  try{
    isLoading.value = true
    shareUrl.value = null
    
    if(isPermanent.value){ expiryType.value = "permanent" }
    // submission
    const formData = new FormData();
    fileUploadValue.value.forEach(file => formData.append("files", file))
    if(expiryType.value == "permanent"){
      formData.append("expiry_type", "permanent")
    } else if(expiryType.value == "date"){
      formData.append("expiry_type", "date")
      formData.append("expires_at", computedExpiryDate.value)
    } else if (expiryType.value == "downloads"){
      formData.append("expiry_type", "downloads")
      formData.append("max_downloads", maxDownloads.value.toString())
    }
    const response = await $fetch("/api/upload", {
      method: "POST",
      body: formData
    })

    shareUrl.value = window.location.href + "s/" + response.token
    submittedExpiryType.value = expiryType.value
    submittedMaxDownloads.value = maxDownloads.value
    submittedExpiryDate.value = computedExpiryDate.value
    isModalOpen.value = false
    isShareModalOpen.value = true
    resetForm()
  } catch (error: any) {
    toast.add({ title: "Upload failed.", description: "Please try again at a later time.", color: "error"})
    console.error(error)
  } finally{
    isLoading.value = false
  }
}

const copyToClipboard = async (text?: string | null) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: 'Copied share link to clipboard', icon: "i-lucide-clipboard-check", color: "success" })
  } catch {
    toast.add({ title: 'Copy failed', color: 'error' })
  }
}
const resetForm = () => {
  fileUploadValue.value = []
  expiryType.value = 'date'
  isPermanent.value = false
  expiryAmount.value = 1
  expiryUnit.value = 'day'
  maxDownloads.value = 1
}
</script>
