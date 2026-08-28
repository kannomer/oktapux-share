<template>
  <UContainer class="w-full pt-8 px-4 sm:px-6 lg:px-8 font-redaction text-lg text-white">
        <div class="flex items-center justify-between mb-10">
          <div>
            <p class="font-redaction-35 uppercase text-2xl">Manage Crates</p>
            <p class="text-sm text-white/80 mt-2">Review and take down Crates on this instance.</p>
          </div>
          <UButton to="/admin" icon="i-lucide-settings" color="neutral" size="lg" label="Settings" />
        </div>

		<div v-if="pending">
			<div v-for="i in 4" :key="i" class="grid grid-cols-[1fr_100px_100px_80px] gap-2 py-2">
			<USkeleton class="h-5" />
			<USkeleton class="h-5" />
			<USkeleton class="h-5" />
			<USkeleton class="h-5" />
			</div>
		</div>

        <p v-if="!shareList?.length" class="text-base text-white/80 text-center py-8">No Crates yet</p>

        <div v-else class="grid grid-cols-[1fr_100px_100px_80px] border-b pb-2 mb-1">
          <span class="text-xl">Crate</span>
          <span class="text-xl">Files</span>
          <span class="text-xl">Status</span>
          <span class="text-xl text-right mr-2">Actions</span>
        </div>
        <div
          v-for="share in shareList"
          :key="share.id"
          class="grid grid-cols-[1fr_100px_100px_80px] items-center py-2 border-b last:border-0"
        >
          <div class="min-w-0 pr-2">
            <p class="text-base truncate flex items-center gap-1.5">
              <UIcon v-if="share.is_reverse" name="i-lucide-inbox" class="shrink-0 text-white/80" />
              <UIcon v-if="share.has_password" name="i-lucide-lock" class="shrink-0 text-white/80" />
              {{ share.name || share.token }}
            </p>
            <p class="text-sm text-white/60 truncate">/s/{{ share.token }} · created {{ new Date(share.created_at).toLocaleDateString() }}</p>
          </div>
          <span class="text-sm text-white/80">{{ share.file_count }} · {{ formatSize(share.total_size) }}</span>
          <span class="text-sm text-white/80">{{ statusLabel(share) }}</span>
          <div class="flex justify-end">
            <UButton
			  data-test="share-delete-button"
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="md"
			  class="mr-5"
              :loading="deletingId === share.id"
              @click="confirmDelete(share)"
            />
          </div>
        </div>

    <UModal
	v-model:open="isConfirmOpen"
	title="Delete this Crate?"
	description="This permanently removes the Crate and its files. This can't be undone."
	class="bg-bg"
	:ui="{ 
		title: 'text-xl',
		description: 'text-white/80 text-base',
		header: 'border-b border-border',
		footer: 'border-t border-border'
	}" >
      <template #footer>
        <UButton label="Cancel" color="neutral" @click="isConfirmOpen = false" />
        <UButton label="Delete" color="error" data-test="confirm-delete-button" :loading="deletingId !== null" @click="doDelete" />
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
    toast.add({ title: 'Crate deleted', color: 'success' })
    isConfirmOpen.value = false
    await refresh()
  } catch (error) {
	const err = error as {
		data?: {
			message?: string
		}
  	}
    toast.add({ title: 'Failed to delete Crate', description: err?.data?.message ?? 'Please try again.', color: 'error' })
  } finally {
    deletingId.value = null
  }
}
</script>
