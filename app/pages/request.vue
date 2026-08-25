<template>
  <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
    <UCard title="Collect files" description="Create a link others can use to send you files" class="w-full" variant="subtle">
      <div class="flex justify-center mt-2">
        <UButton type="button" label="Create collection" icon="i-lucide-folder-up" color="neutral" size="xl" @click="openReverseModal"/>
      </div>
    </UCard>

    <!-- Request creation modal -->
    <UModal v-model:open="isReverseModalOpen" title="Collect files" description="Create a link others can use to send you files">
      <template #body>
        <div v-if="!reverseIsPermanent" class="flex gap-2">
          <UInputNumber v-model="reverseExpiryAmount" :min="1" class="w-24" />
          <USelect
            v-model="reverseExpiryUnit"
            :items="expiryUnitOptions"
            class="flex-1"
          />
        </div>
        <p v-if="!reverseIsPermanent" class="text-xs text-muted mt-1">
          Expires on {{ reverseComputedExpiryDisplay }}
        </p>
        <p v-if="!reverseIsPermanent && config?.max_expiry_days" class="text-xs text-muted">
          This server caps expiry at {{ config.max_expiry_days }} day{{ config.max_expiry_days === 1 ? '' : 's' }}
        </p>
        <USwitch v-if="config?.allow_permanent_shares" v-model="reverseIsPermanent" label="Permanent collection" class="mt-4" />
        <USeparator type="dashed" class="mt-5"/>
        <div class="flex flex-col gap-2 mt-4">
          <UInput v-model="reverseName" placeholder="Collection name (optional)"/>
          <UTextarea v-model="reverseDescription" placeholder="Tell submitters what to upload (optional)" autoresize :maxrows="4"/>
          <UInput
            v-model="reversePassword"
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
        <UButton label="Create collection" size="lg" icon="i-lucide-folder-up" loading-auto :disabled="isReverseLoading" loading-icon="i-lucide-loader" @click="attemptReverseCreate" />
      </template>
    </UModal>

    <!-- Result modal: two links-->
    <UModal v-model:open="isReverseShareModalOpen" title="Your file collection request is ready">
      <template #body>
        <p class="font-semibold flex items-center gap-1.5">
          <UIcon name="i-lucide-folder-up" />
          Collection link - share this with submitters
        </p>
        <UInput :model-value="collectionUrl ?? ''" readonly class="w-full mt-2"/>

        <p class="font-semibold flex items-center gap-1.5 mt-4">
          <UIcon name="i-lucide-lock" />
          Owner link - keep this private, use it to view collected files
        </p>
        <UInput :model-value="ownerUrl ?? ''" readonly class="w-full mt-2"/>

        <p v-if="reverseSubmittedInfo?.isPermanent" class="text-xs text-muted mt-3">
          This collection never expires
        </p>
        <p v-else-if="reverseSubmittedInfo?.expiryDate" class="text-xs text-muted mt-3">
          Expires on {{ new Date(reverseSubmittedInfo.expiryDate).toLocaleString() }}
        </p>
        <p v-if="reverseSubmittedInfo?.isPasswordProtected" class="text-xs text-muted mt-2">
          Password protected
        </p>
      </template>
      <template #footer>
        <UButton icon="i-lucide-clipboard-pen" label="Copy collection link" size="lg" variant="solid" @click="copyToClipboard(collectionUrl ?? '')"/>
        <UButton icon="i-lucide-clipboard-pen" label="Copy owner link" size="lg" variant="outline" @click="copyToClipboard(ownerUrl ?? '')"/>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
const { data: config } = await useSiteConfig()

const isReverseModalOpen = ref(false)
const reverseIsPermanent = ref(false)
const reverseExpiryAmount = ref(1)
const reverseExpiryUnit = ref("day")
const reverseName = ref<string>("")
const reverseDescription = ref<string>("")
const reversePassword = ref<string>("")

const expiryUnitOptions = [
  { label: 'Minute(s)', value: 'minute' },
  { label: 'Hour(s)', value: 'hour' },
  { label: 'Day(s)', value: 'day' },
  { label: 'Week(s)', value: 'week' },
  { label: 'Month(s)', value: 'month' },
  { label: 'Year(s)', value: 'year' }
]

const { computedExpiryDate: reverseComputedExpiryDate } = useComputeExpiryDate(reverseExpiryAmount, reverseExpiryUnit)
const reverseComputedExpiryDisplay = computed(() => new Date(reverseComputedExpiryDate.value).toLocaleString())

const {
  handleReverseCreate,
  isLoading: isReverseLoading,
  ownerUrl,
  collectionUrl,
  isReverseShareModalOpen,
  submittedInfo: reverseSubmittedInfo
} = useHandleReverseCreate({
  isPermanent: reverseIsPermanent,
  expiryAmount: reverseExpiryAmount,
  expiryUnit: reverseExpiryUnit,
  computedExpiryDate: reverseComputedExpiryDate,
  shareName: reverseName,
  shareDescription: reverseDescription,
  sharePassword: reversePassword
})

const { copyToClipboard } = useCopyToClipboard()

const openReverseModal = () => {
  if (config.value?.allow_reverse_shares === false) {
    useToast().add({ title: "Reverse shares disabled", description: "This feature has been disabled by the server admin.", color: "warning" })
    return
  }
  isReverseModalOpen.value = true
}

const attemptReverseCreate = () => {
  if (config.value?.allow_passwordless_shares === false && !reversePassword.value) {
    useToast().add({ title: "Password required", description: "This server requires a password on every share", color: "warning" })
    return
  }
  handleReverseCreate(() => { isReverseModalOpen.value = false })
}
</script>
