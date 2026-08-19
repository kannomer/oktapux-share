<template>
  <UContainer class="flex justify-center pt-8 w-full max-w-3xl">
    <UCard class="w-full" variant="subtle">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold">Manage shares</p>
            <p class="text-sm text-muted mt-1">Review and take down shares on this instance</p>
          </div>
          <UButton to="/admin" icon="i-lucide-settings" variant="ghost" color="neutral" size="sm" label="Settings" />
        </div>
      </template>

      <template v-if="pending">
        <div class="grid grid-cols-[1fr_100px_100px_80px] gap-2 py-2" v-for="i in 4" :key="i">
          <USkeleton class="h-5" />
          <USkeleton class="h-5" />
          <USkeleton class="h-5" />
          <USkeleton class="h-5" />
        </div>
      </template>

      <template v-else-if="!shareList?.length">
        <p class="text-sm text-muted text-center py-8">No shares yet</p>
      </template>

      <template v-else>
        <div class="grid grid-cols-[1fr_100px_100px_80px] border-b pb-2 mb-1">
          <span class="text-sm font-semibold ml-2">Share</span>
          <span class="text-sm font-semibold">Files</span>
          <span class="text-sm font-semibold">Status</span>
          <span class="text-sm font-semibold text-right mr-2">Actions</span>
        </div>
        <div
          v-for="share in shareList"
          :key="share.id"
          class="grid grid-cols-[1fr_100px_100px_80px] items-center py-2 border-b last:border-0"
        >
          <div class="min-w-0 pr-2">
            <p class="text-sm font-medium truncate flex items-center gap-1.5">
              <UIcon v-if="share.is_reverse" name="i-lucide-inbox" class="shrink-0" />
              <UIcon v-if="share.has_password" name="i-lucide-lock" class="shrink-0 text-muted" />
              {{ share.name || share.token }}
            </p>
            <p class="text-xs text-muted truncate">/s/{{ share.token }} · created {{ new Date(share.created_at).toLocaleDateString() }}</p>
          </div>
          <span class="text-sm text-muted">{{ share.file_count }} · {{ formatSize(share.total_size) }}</span>
          <span class="text-sm text-muted">{{ statusLabel(share) }}</span>
          <div class="flex justify-end">
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="sm"
              :loading="deletingId === share.id"
              @click="confirmDelete(share)"
            />
          </div>
        </div>
      </template>
    </UCard>

    <UModal v-model:open="isConfirmOpen" title="Delete this share?" description="This permanently removes the share and its files. This can't be undone.">
      <template #footer>
        <UButton label="Cancel" variant="ghost" color="neutral" @click="isConfirmOpen = false" />
        <UButton label="Delete" color="error" :loading="deletingId !== null" @click="doDelete" />
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'require-admin' })

interface AdminShare {
  id: number
  token: string
  name: string | null
  description: string | null
  created_at: string
  expires_at: string | null
  max_downloads: number | null
  download_count: number
  is_reverse: boolean
  has_password: boolean
  file_count: number
  total_size: number
}

const { data: shareList, pending, refresh } = await useFetch<AdminShare[]>('/api/admin/shares')
const formatSize = useFormatSize()
const toast = useToast()

const statusLabel = (share: AdminShare) => {
  if (share.expires_at && new Date(share.expires_at) <= new Date()) return 'Expired'
  if (share.max_downloads && share.download_count >= share.max_downloads) return 'Expired'
  if (share.max_downloads) return `${share.download_count}/${share.max_downloads} dl`
  if (share.expires_at) return new Date(share.expires_at).toLocaleDateString()
  return 'Permanent'
}

const isConfirmOpen = ref(false)
const pendingDelete = ref<AdminShare | null>(null)
const deletingId = ref<number | null>(null)

const confirmDelete = (share: AdminShare) => {
  pendingDelete.value = share
  isConfirmOpen.value = true
}

const doDelete = async () => {
  if (!pendingDelete.value) return
  deletingId.value = pendingDelete.value.id
  try {
    await $fetch(`/api/admin/shares/${pendingDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Share deleted', color: 'success' })
    isConfirmOpen.value = false
    await refresh()
  } catch (error: any) {
    toast.add({ title: 'Failed to delete share', description: error?.data?.message ?? 'Please try again.', color: 'error' })
  } finally {
    deletingId.value = null
  }
}
</script>
