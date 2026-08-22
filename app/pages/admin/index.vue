<template>
  <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
    <UCard class="w-full" variant="subtle">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">Instance settings</p>
            <p class="text-sm text-muted mt-1">Configure how this Oktapux Share instance behaves</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton to="/admin/shares" icon="i-lucide-folder-tree" variant="ghost" color="neutral" size="sm" label="Manage shares" />
            <UButton icon="i-lucide-log-out" variant="ghost" color="neutral" size="sm" label="Log out" @click="logout" />
          </div>
        </div>
      </template>

      <USkeleton v-if="pending" class="h-64 w-full" />
      <SettingsForm v-else-if="config" :settings="config" :saving="isSaving" @save="saveConfig" />
    </UCard>
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
