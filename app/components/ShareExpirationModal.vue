<script setup lang="ts">
interface SiteConfig {
  allow_permanent_shares?: boolean
  allow_passwordless_shares?: boolean
  max_expiry_days?: number | null
  cap_download_based_expiry?: boolean
}

const props = defineProps<{
  config?: SiteConfig | null
}>()

const isOpen = defineModel<boolean>('open', { required: true })
const expiryType = defineModel<'date' | 'downloads'>('expiryType', { required: true })
const isPermanent = defineModel<boolean>('isPermanent', { required: true })
const expiryAmount = defineModel<number>('expiryAmount', { required: true })
const expiryUnit = defineModel<string>('expiryUnit', { required: true })
const maxDownloads = defineModel<number>('maxDownloads', { required: true })
const shareName = defineModel<string>('shareName', { required: true })
const shareDescription = defineModel<string>('shareDescription', { required: true })
const sharePassword = defineModel<string>('sharePassword', { required: true })
const shareSlug = defineModel<string>('shareSlug', { required: true })

const emit = defineEmits<{
  submit: []
}>()

const expiryUnitOptions = [
  { label: 'Minute(s)', value: 'minute' },
  { label: 'Hour(s)', value: 'hour' },
  { label: 'Day(s)', value: 'day' },
  { label: 'Week(s)', value: 'week' },
  { label: 'Month(s)', value: 'month' },
  { label: 'Year(s)', value: 'year' }
]

const { computedExpiryDate } = useComputeExpiryDate(expiryAmount, expiryUnit)
const computedExpiryDisplay = computed(() => new Date(computedExpiryDate.value).toLocaleString())

const expiryTypeOptions = [
  { label: 'Date', value: 'date' },
  { label: 'Download count', value: 'downloads' }
]
</script>

<template>
  <UModal v-model:open="isOpen" title="Create share" description="Set a name, description and expiration">
    <template #body>
      <URadioGroup
        v-model="expiryType"
        :disabled="isPermanent"
        legend="Expires by"
        :items="expiryTypeOptions"
      />

      <div v-if="expiryType === 'date'" class="flex gap-2 mt-4">
        <UInputNumber v-model="expiryAmount" :disabled="isPermanent" :min="1" class="w-24" />
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
      <p v-if="expiryType === 'date' && props.config?.max_expiry_days" class="text-xs text-muted">
        This server caps expiry at {{ props.config.max_expiry_days }} day{{ props.config.max_expiry_days === 1 ? '' : 's' }}
      </p>

      <p v-if="expiryType === 'downloads'" class="text-sm text-muted mt-4 mb-1">Max downloads</p>
      <UInputNumber
        v-if="expiryType === 'downloads'"
        v-model="maxDownloads"
        :disabled="isPermanent"
        :min="1"
      />
      <p v-if="expiryType === 'downloads' && props.config?.cap_download_based_expiry && props.config?.max_expiry_days" class="text-xs text-muted mt-1">
        This server also expires download-based shares after {{ props.config.max_expiry_days }} day{{ props.config.max_expiry_days === 1 ? '' : 's' }}, whichever comes first
      </p>
      <USwitch v-if="props.config?.allow_permanent_shares" v-model="isPermanent" label="Permanent share" class="mt-4" />
      <USeparator type="dashed" class="mt-5" />

      <div class="flex flex-col gap-2 mt-4">
        <UInput v-model="shareName" placeholder="Share name (optional)" />
        <UTextarea v-model="shareDescription" placeholder="Share description (optional)" autoresize :maxrows="4" />
        <UInput
          v-model="sharePassword"
          type="password"
          :placeholder="props.config?.allow_passwordless_shares === false ? 'Password (required)' : 'Password (optional)'"
          icon="i-lucide-lock"
        />
        <p v-if="props.config?.allow_passwordless_shares === false" class="text-xs text-muted">
          This server requires a password on every share
        </p>
        <UInput v-model="shareSlug" placeholder="Custom URL (optional)" />
      </div>
    </template>

    <template #footer>
      <UButton label="Upload" size="lg" icon="i-lucide-upload" @click="emit('submit')" />
    </template>
  </UModal>
</template>
