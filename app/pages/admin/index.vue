<template>
  <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
    <UCard class="w-full" variant="subtle">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">Instance settings</p>
            <p class="text-sm text-muted mt-1">Configure how this Oktapux Share instance behaves</p>
          </div>
          <UButton icon="i-lucide-log-out" variant="ghost" color="neutral" size="sm" label="Log out" @click="logout" />
        </div>
      </template>

      <USkeleton v-if="pending" class="h-64 w-full" />
      <SettingsForm v-else-if="config" :settings="config" :saving="isSaving" @save="saveConfig" />
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'require-admin' })

const { data: config, pending, refresh } = await useSiteConfig()
const isSaving = ref(false)
const toast = useToast()

const saveConfig = async (values: any) => {
  isSaving.value = true
  try {
    await $fetch('/api/config', { method: 'PATCH', body: values })
    await refresh()
    toast.add({ title: 'Settings saved', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'Failed to save settings', description: error?.data?.message ?? 'Please try again.', color: 'error' })
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
