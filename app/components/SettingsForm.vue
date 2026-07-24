<template>
  <div class="flex flex-col gap-4 mt-2">
    <UInput v-model="siteName" placeholder="Site name (optional)" icon="i-lucide-signature" />

    <div class="flex items-center gap-2">
      <UInputNumber v-model="maxFileSizeMb" :min="1" class="w-32" />
      <span class="text-sm text-muted">MB max file size</span>
    </div>

    <USeparator type="dashed" />

    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium">Allow passwordless shares</p>
        <p class="text-xs text-muted">If off, every share must have a password</p>
      </div>
      <USwitch v-model="localSettings.allow_passwordless_shares" />
    </div>

    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium">Allow permanent shares</p>
        <p class="text-xs text-muted">If off, every share must have an expiry</p>
      </div>
      <USwitch v-model="localSettings.allow_permanent_shares" />
    </div>

    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium">Enable QR code</p>
        <p class="text-xs text-muted">Show a QR code option after creating a share</p>
      </div>
      <USwitch v-model="localSettings.enable_qr_code" />
    </div>

    <USeparator type="dashed" />

    <div>
      <p class="text-sm font-medium mb-1">Max expiry (days)</p>
      <div class="flex items-center gap-2">
        <UInputNumber v-model="maxExpiryDays" :min="1" placeholder="No cap" class="w-32" />
        <UButton
          v-if="localSettings.max_expiry_days"
          label="Clear"
          variant="link"
          size="xs"
          color="neutral"
          @click="maxExpiryDays = undefined"
        />
      </div>
      <p class="text-xs text-muted mt-1">Caps how far out a date-based expiry can be set. Leave empty for no cap.</p>
    </div>

    <div v-if="localSettings.max_expiry_days" class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium">Also cap download-based shares</p>
        <p class="text-xs text-muted">Download-based shares also expire after the day cap above, whichever comes first</p>
      </div>
      <USwitch v-model="localSettings.cap_download_based_expiry" />
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
interface Settings {
  max_file_size: number
  allow_passwordless_shares: boolean
  allow_permanent_shares: boolean
  max_expiry_days: number | null
  cap_download_based_expiry: boolean
  enable_qr_code: boolean
  site_name: string | null
}

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
