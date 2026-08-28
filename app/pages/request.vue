<template>
  <UContainer class="w-full pt-8 px-4 sm:px-6 lg:px-8 font-redaction text-lg">
      <div class="w-full mb-8 text-center">
		<h1 class="font-redaction-35 text-4xl uppercase tracking-tight text-white">
			Collect Files
		</h1>
		<p class="mt-2 text-xl text-white/80">
			Create a link others can use to send you files.
		</p>
        <UButton type="button" label="Create collection" icon="i-lucide-folder-up" color="neutral" size="xl" class="mt-5" @click="openReverseModal"/>
      </div>

    <!-- Request creation modal -->
    <UModal
	v-model:open="isReverseModalOpen"
	title="Collect files"
	description="Create a link others can use to send you files"
	class="bg-bg"
	:ui="{ 
		title: 'text-xl',
		description: 'text-white/80 text-base',
		header: 'border-b border-border',
		footer: 'border-t border-border'
  	}" >
      <template #body>
        <div v-if="!reverseIsPermanent" class="flex gap-2">
          <UInputNumber
		  v-model="reverseExpiryAmount"
		  :min="1"
		  class="w-36"
		  size="xl"
		  variant="ghost"
		  color="neutral"
		  :ui="{
			base: 'hover:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-0'
		  }" />
          <USelect
            v-model="reverseExpiryUnit"
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
			}" />
        </div>
        <p v-if="!reverseIsPermanent" class="text-sm text-white/80 mt-1">
          Expires on {{ reverseComputedExpiryDisplay }}
        </p>
        <p v-if="!reverseIsPermanent && config?.max_expiry_days" class="text-xs text-white/80 mt-1">
          This server caps expiry at {{ config.max_expiry_days }} day{{ config.max_expiry_days === 1 ? '' : 's' }}
        </p>
        <USwitch
		v-if="config?.allow_permanent_shares"
		v-model="reverseIsPermanent"
		label="Permanent collection"
		class="mt-4"
		size="xl"
		color="neutral"
		:ui="{
			thumb: 'bg-bg',
			base: 'bg-white/70!'
		}" />
        <USeparator type="dashed" class="mt-5"/>
        <div class="flex flex-col gap-2 mt-4">
          <UInput
		  v-model="reverseName"
		  size="xl"
		  placeholder="Collection name (optional)"
		  color="neutral"
		  :ui="{
			base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35'
		  }" />
          <UTextarea
		  v-model="reverseDescription"
		  size="xl"
		  placeholder="Tell submitters what to upload (optional)"
		  color="neutral"
		  autoresize :maxrows="4"
		  :ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35'
  		  }" />
          <UInput
            v-model="reversePassword"
            type="password"
			size="xl"
            :placeholder="config?.allow_passwordless_shares === false ? 'Password (required)' : 'Password (optional)'"
			color="neutral"
			icon="i-lucide-lock"
			:ui="{
				base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
				leadingIcon: 'text-white/35'
			}" />
          <p v-if="config?.allow_passwordless_shares === false" class="text-sm text-white/80">
            This server requires a password on every share
          </p>
        </div>
      </template>
      <template #footer>
        <UButton
		label="Create collection"
		size="xl"
		icon="i-lucide-folder-up"
		color="neutral"
		loading-auto
		:disabled="isReverseLoading"
		loading-icon="i-lucide-loader"
		@click="attemptReverseCreate" />
      </template>
    </UModal>

    <!-- Result modal: two links-->
    <UModal
	v-model:open="isReverseShareModalOpen"
	title="Your file collection request is ready"
	class="bg-bg"
	:ui="{ 
		title: 'text-xl',
		header: 'border-b border-border',
		footer: 'border-t border-border'
  	}">
      <template #body>
        <p class="text-lg flex items-center gap-1.5">
          <UIcon name="i-lucide-folder-up" />
          Collection link - share this with submitters
        </p>
        <UInput
		:model-value="collectionUrl ?? ''"
		readonly
		size="xl"
		color="neutral"
		class="w-full mt-2"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35'
  		}" />

        <p class="text-lg flex items-center gap-1.5 mt-4">
          <UIcon name="i-lucide-lock" />
          Owner link - Private, used to view collected files
        </p>
        <UInput
		:model-value="ownerUrl ?? ''"
		readonly
		size="xl"
		color="neutral"
		class="w-full mt-2"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35'
  		}" />

        <p v-if="reverseSubmittedInfo?.isPermanent" class="text-sm text-white/80 mt-3">
          This collection never expires
        </p>
        <p v-else-if="reverseSubmittedInfo?.expiryDate" class="text-sm text-white/80 mt-3">
          Expires on {{ new Date(reverseSubmittedInfo.expiryDate).toLocaleString() }}
        </p>
        <p v-if="reverseSubmittedInfo?.isPasswordProtected" class="text-sm text-white/80 mt-2">
          Password protected
        </p>
      </template>
      <template #footer>
        <UButton
		icon="i-lucide-clipboard-pen"
		label="Copy collection link"
		size="lg"
		color="neutral"
		@click="copyToClipboard(collectionUrl ?? '')"/>

        <UButton
		icon="i-lucide-clipboard-pen"
		label="Copy owner link"
		size="lg"
		variant="outline"
		color="neutral"
  		class="bg-bg hover:bg-gray-950"
		@click="copyToClipboard(ownerUrl ?? '')"/>
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
