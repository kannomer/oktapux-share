<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { required: true })

defineProps<{
  qrCodeUrl: string | null
}>()
</script>

<template>
  <UModal
  v-if="qrCodeUrl"
  v-model:open="isOpen"
  title="Your QR Code is created"
  class="bg-bg font-redaction"
  :ui="{
	title: 'text-2xl',
	header: 'border-b border-border',
    footer: 'border-t border-border'
  }">
    <template #body>
      <div class="block justify-center">
        <img :src="qrCodeUrl" class="mt-4 mx-auto" alt="QR code">
      </div>
    </template>
    <template #footer>
      <UButton icon="i-lucide-download" label="Download QR Code" size="xl" color="neutral" :href="qrCodeUrl" download="share-qr.png" />
    </template>
  </UModal>
</template>
