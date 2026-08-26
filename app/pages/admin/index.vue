<template>
  <UContainer class="w-full pt-8 px-4 sm:px-6 lg:px-8 font-redaction text-lg text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-redaction-35 uppercase text-2xl">Instance settings</p>
            <p class="text-base text-white/80 mt-1">Configure how this Crateyard instance behaves.</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton to="/admin/shares" icon="i-lucide-folder-tree" color="neutral" size="lg" label="Manage crates" />
            <UButton icon="i-lucide-log-out" color="neutral" size="lg" label="Log out" @click="logout" />
          </div>
        </div>

      <USkeleton v-if="pending" class="h-64 w-full" />
      <SettingsForm v-else-if="config" :settings="config" :saving="isSaving" @save="saveConfig" />
  </UContainer>
</template>

<script setup lang="ts">
import type { Settings } from '~/types/settings'

definePageMeta({ middleware: 'require-admin' })

const { data: config, pending, refresh } = await useSiteConfig()
const isSaving = ref(false)
const toast = useToast()

const saveConfig = async (values: Settings) => {
  isSaving.value = true
  try {
    await $fetch('/api/config', {
	method: 'PATCH',
	body: {
			max_file_size: values.max_file_size,
			allow_passwordless_shares: values.allow_passwordless_shares,
			allow_permanent_shares: values.allow_permanent_shares,
			max_expiry_days: values.max_expiry_days,
			cap_download_based_expiry: values.cap_download_based_expiry,
			enable_qr_code: values.enable_qr_code,
			allow_reverse_shares: values.allow_reverse_shares,
			site_name: values.site_name,
		},
	})
    await refresh()
    toast.add({ title: 'Settings saved', color: 'success' })
  } catch (error) {
	const err = error as { data?: { message?: string } }
    toast.add({ title: 'Failed to save settings', description: err?.data?.message ?? 'Please try again.', color: 'error' })
  } finally {
    isSaving.value = false
  }
}

const { clear } = useUserSession()

const logout = async () => {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await clear()
  await navigateTo('/admin/login')
}
</script>
