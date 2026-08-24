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
const sharePassword = defineModel<string>('shareSecretInput', { required: true })
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
  <UModal
  v-model:open="isOpen"
  title="Create share"
  description="Set a name, description and expiration"
  class="bg-bg"
  :ui="{ 
	title: 'text-xl',
  	description: 'text-white/80 text-base',
	header: 'border-b border-border',
    footer: 'border-t border-border'
  }">
    <template #body>
      <URadioGroup
        v-model="expiryType"
        :disabled="isPermanent"
        legend="Expires by"
		color="neutral"
        :items="expiryTypeOptions"
		:ui="{ legend: 'text-xl', item: 'text-base' }"
      />

      <div v-if="expiryType === 'date'" class="flex gap-2 mt-4">
        <UInputNumber
		v-model="expiryAmount"
		:disabled="isPermanent"
		:min="1"
		class="w-36"
		size="xl"
		variant="ghost"
		color="neutral"
		:ui="{
			base: 'hover:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-0'
		}"/>
        <USelect
		v-model="expiryUnit"
		:disabled="isPermanent"
		:items="expiryUnitOptions"
		class="flex-1 bg-bg"
		variant="ghost"
		color="neutral"
		:ui="{
			base: 'hover:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-0',
			value: 'text-lg',
			content: 'bg-bg border border-white/35',
			item: 'text-white',
			itemLabel: 'text-white'
		}"
		/>
      </div>
      <p v-if="expiryType === 'date'" class="text-sm text-white/80 mt-1">
        Expires on {{ computedExpiryDisplay }}
      </p>
      <p v-if="expiryType === 'date' && props.config?.max_expiry_days" class="text-sm text-muted">
        This server caps expiry at {{ props.config.max_expiry_days }} day{{ props.config.max_expiry_days === 1 ? '' : 's' }}
      </p>

      <p v-if="expiryType === 'downloads'" class="text-sm text-white/80 mt-4 mb-1">Max downloads</p>
      <UInputNumber
		v-if="expiryType === 'downloads'"
		v-model="maxDownloads"
		:disabled="isPermanent"
		:min="1"
		size="xl"
		class="w-full"
		variant="ghost"
		color="neutral"
		:ui="{
			base: 'hover:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-0'
		}"
	  />
      <p v-if="expiryType === 'downloads' && props.config?.cap_download_based_expiry && props.config?.max_expiry_days" class="text-sm text-muted mt-1">
        This server also expires download-based shares after {{ props.config.max_expiry_days }} day{{ props.config.max_expiry_days === 1 ? '' : 's' }}, whichever comes first
      </p>
      <USwitch
	  v-if="props.config?.allow_permanent_shares"
	  v-model="isPermanent"
	  label="Permanent share"
	  class="mt-4"
	  size="xl"
	  color="neutral"
	  :ui="{
		thumb: 'bg-bg',
		base: 'bg-white/70!'
	  }" />
      <USeparator type="dashed" class="mt-5" />

      <div class="flex flex-col gap-2 mt-4">
        <UInput
		v-model="shareName"
		size="xl"
		placeholder="Share name (optional)"
		color="neutral"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35'
  		}" />
        <UTextarea
		v-model="shareDescription"
		size="xl"
		placeholder="Share description (optional)"
		color="neutral"
		autoresize :maxrows="4"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35'
  		}" />
        <UInput
          v-model="sharePassword"
          type="password"
		  size="xl"
          :placeholder="props.config?.allow_passwordless_shares === false ? 'Password (required)' : 'Password (optional)'"
		  color="neutral"
          icon="i-lucide-lock"
		  :ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
			leadingIcon: 'text-white/35'
  		  }"
        />
        <p v-if="props.config?.allow_passwordless_shares === false" class="text-sm text-white/80">
          This server requires a password on every share
        </p>
        <UInput
		v-model="shareSlug"
		size="xl"
		placeholder="Custom URL (optional)" 
		color="neutral"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35'
  		}" />
      </div>
    </template>

    <template #footer>
      <UButton label="Upload" size="xl" icon="i-lucide-upload" color="neutral" @click="emit('submit')" />
    </template>
  </UModal>
</template>
