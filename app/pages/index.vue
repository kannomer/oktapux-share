<template>
  <div class="min-h-screen bg-neutral p-4">
    <div class="max-w-2xl mx-auto">
      <div class="mb-8">
        <h1>Storq</h1>
        <p>Share files with expiring links</p>
      </div>
        <UFileUpload
           multiple
          icon="i-lucide-cloud-upload"
          label="Drop your files here" 
          description="(Max. 500MB)"
          layout="list"
          :interactive="false"
          v-model="fileUploadValue" 
          class="w-96 min-h-48 mix-blend-color"
        >

          <template #actions="{ open }">
            <UButton
              label="Select files"
              icon="i-lucide-upload"
              color="neutral"
              variant="outline"
              @click="open()"
            />
          </template>
          <template #files-bottom="{ removeFile, files }">
            <UButton
              v-if="files?.length"
              label="Remove all files"
              color="neutral"
              @click="removeFile()"
            />
          </template>
        </UFileUpload>
        
        <UButton type="button" label="Share" icon="i-lucide-share" @click="openExpirationModal" color="neutral"/>

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
              Expires on {{ computedExpiryDate }}
            </p>

            <!-- Conditional: download count input -->
            <UInput
              v-if="expiryType === 'downloads'"
              :disabled="isPermanent"
              v-model="maxDownloads"
              type="number"
              min="1"
              placeholder="Max downloads"
              class="mt-4"
            />

            <USwitch v-model="isPermanent" v-on:update:model-value="" label="Permanent share" class="mt-4" />
          </template>


          <template #footer>
            <UButton label="Cancel" color="neutral" variant="outline" @click="isModalOpen = false" />
            <UButton label="Upload" icon="i-lucide-upload" @click="handleSubmit" />
          </template>
        </UModal>
      <!-- TODO: display link with copy to clipboard after upload succeeds -->
      <!-- TODO: keep QR Code in mind -->
    </div>
  </div>
</template>

<script setup lang="ts">
const fileUploadValue = ref<File[]>([])
const isModalOpen = ref(false)
const expiryType = ref<'date' | 'downloads' | "permanent">('date')
const isPermanent = ref(false)
const expiryAmount = ref(1)
const expiryUnit = ref('day')

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
const maxDownloads = ref<number>(1)

// check if files are selected
const openExpirationModal = () => {
  if (!fileUploadValue.value?.length) {
    console.log('No files selected')
    return;
  }
  isModalOpen.value = true
}

const isLoading = ref(false)
const shareToken = ref<string | null>(null)
const uploadError = ref<string | null>(null)
const handleSubmit = async () => {
  try{
    isLoading.value = true
    uploadError.value = null
    shareToken.value = null
    
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

    shareToken.value = response.token
    console.log("TESTING TESTING TESTING " + shareToken.value)
    isModalOpen.value = false
  } catch (error: any) {
    uploadError.value = error?.data?.message || "Upload failed"
    console.error(error)
  } finally{
    isLoading.value = false
  }
}
// TODO: Add reset form function
</script>
