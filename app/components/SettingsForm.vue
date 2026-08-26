<template>
  <div class="flex flex-col gap-4 mt-2">
    <UInput
	v-model="siteName"
	placeholder="Site name (optional)"
	size="xl"
	icon="i-lucide-signature"
	color="neutral"
	class="mb-2"
	:ui="{
    	base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
		leadingIcon: 'text-white/35'
  	}" />

    <div class="flex items-center gap-2">
      <UInputNumber
	  v-model="maxFileSizeMb"
	  :min="1"
	  size="xl"
	  class="w-270"
	  variant="ghost"
	  color="neutral"
	  :ui="{
		base: 'hover:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-0'
	  }" />
      <span class="text-base text-white/80">MB max file size</span>
    </div>

    <USeparator type="dashed" />

    <div class="flex items-center justify-between">
      <div>
        <p class="text-lg">Allow passwordless Crates</p>
        <p class="text-sm text-white/80">If off, every Crate must have a password</p>
      </div>
      <USwitch
	  v-model="localSettings.allow_passwordless_shares"
	  size="lg"
	  color="neutral"
	  :ui="{
		thumb: 'bg-bg',
		base: 'bg-white/70!'
	  }" />
    </div>

    <div class="flex items-center justify-between">
      <div>
        <p class="text-lg">Allow permanent Crates</p>
        <p class="text-sm text-white/80">If off, every Crate must have an expiry</p>
      </div>
      <USwitch
	  v-model="localSettings.allow_permanent_shares"
	  size="lg"
	  color="neutral"
	  :ui="{
		thumb: 'bg-bg',
		base: 'bg-white/70!'
	  }" />
    </div>

    <div class="flex items-center justify-between">
      <div>
        <p class="text-lg">Enable QR code</p>
        <p class="text-sm text-white/80">Show a QR code option after creating a Crate</p>
      </div>
      <USwitch
	  v-model="localSettings.enable_qr_code"
	  size="lg"
	  color="neutral"
	  :ui="{
		thumb: 'bg-bg',
		base: 'bg-white/70!'
	  }" />
    </div>

    <div class="flex items-center justify-between">
      <div>
        <p class="text-lg">Allow Collections</p>
        <p class="text-sm text-white/80">If off, the "File collection" feature is disabled</p>
      </div>
      <USwitch
	  v-model="localSettings.allow_reverse_shares"
	  size="lg"
	  color="neutral"
	  :ui="{
		thumb: 'bg-bg',
		base: 'bg-white/70!'
	  }" />
    </div>

    <USeparator type="dashed" />

    <div>
      <p class="text-lg mb-2">Max expiry (days)</p>
      <div class="flex items-center gap-2">
        <UInputNumber
		v-model="maxExpiryDays"
		:min="1"
		placeholder="No cap"
		size="xl"
		class="w-full"
		variant="ghost"
		color="neutral"
		:ui="{
			base: 'hover:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-0'
		}" />
        <UButton
          v-if="localSettings.max_expiry_days"
          label="Clear"
          variant="link"
          size="xs"
          color="neutral"
		  class="text-base"
          @click="maxExpiryDays = undefined"
        />
      </div>
      <p class="text-sm text-white/80 mt-2">Caps how far out a date-based expiry can be set. Leave empty for no cap.</p>
    </div>

    <div v-if="localSettings.max_expiry_days" class="flex items-center justify-between">
      <div>
        <p class="text-lg">Also cap download-based Crates</p>
        <p class="text-sm text-white/80">Download-based Crates also expire after the day cap above, whichever comes first</p>
      </div>
      <USwitch
	  v-model="localSettings.cap_download_based_expiry"
	  size="lg"
	  color="neutral"
	  :ui="{
		thumb: 'bg-bg',
		base: 'bg-white/70!'
	  }" />
    </div>

    <div class="flex justify-center mt-2">
      <UButton
        label="Save settings"
        icon="i-lucide-save"
        size="lg"
        color="neutral"
        :loading="saving"
        @click="save"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Settings } from '~/types/settings'

const props = defineProps<{
  settings: Settings
  saving?: boolean
}>()

const emit = defineEmits<{ save: [value: Settings] }>()

const localSettings = reactive<Settings>({ ...props.settings })

// Keep the local copy in sync if the parent refetches/reassigns settings
// (e.g. after a successful save).
watch(() => props.settings, (val) => Object.assign(localSettings, val))

// UI-friendly MB <-> stored bytes conversion
const maxFileSizeMb = computed({
  get: () => Math.round(localSettings.max_file_size / (1024 * 1024)),
  set: (val: number) => { localSettings.max_file_size = Math.round(val * 1024 * 1024) }
})

// UInput doesn't handle `null` well either, so bridge null <-> undefined
// the same way we do for maxExpiryDays below.
const siteName = computed({
  get: () => localSettings.site_name ?? undefined,
  set: (val: string | undefined) => { localSettings.site_name = val ?? null }
})

// UInputNumber doesn't handle `null` well, so bridge null <-> undefined here
const maxExpiryDays = computed({
  get: () => localSettings.max_expiry_days ?? undefined,
  set: (val: number | undefined) => { localSettings.max_expiry_days = val ?? null }
})

const save = () => emit('save', { ...localSettings })
</script>
