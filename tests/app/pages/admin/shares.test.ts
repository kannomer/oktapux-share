import { defineComponent, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dataRef, refreshMock, addToast, fetchMock } = vi.hoisted(() => ({
  dataRef: { value: [] as Array<Record<string, unknown>> },
  refreshMock: vi.fn(),
  addToast: vi.fn(),
  fetchMock: vi.fn(),
}))

mockNuxtImport('useFetch', () => () => ({
  data: ref(dataRef.value),
  pending: ref(false),
  refresh: refreshMock,
}))
mockNuxtImport('useToast', () => () => ({ add: addToast }))
mockNuxtImport('useFormatSize', () => () => (bytes: number) => `${bytes} B`)
mockNuxtImport('$fetch', () => fetchMock)

vi.stubGlobal('definePageMeta', vi.fn())

const uiStub = defineComponent({
  inheritAttrs: false,
  template: '<div><slot name="header" /><slot name="body" /><slot /><slot name="footer" /></div>',
})

const buttonStub = defineComponent({
  props: {
    label: { type: String, default: '' },
    icon: { type: String, default: '' },
    loading: { type: Boolean, default: false },
  },
  emits: ['click'],
  template: "<button type=\"button\" @click=\"$emit('click')\">{{ label }}</button>",
})

const { default: AdminSharesPage } = await import('../../../../app/pages/admin/shares.vue')

const sampleShare = {
  id: 42,
  token: 'share-token',
  name: 'Test share',
  description: null,
  created_at: '2026-08-21T00:00:00.000Z',
  expires_at: null,
  max_downloads: null,
  download_count: 0,
  is_reverse: false,
  has_password: false,
  file_count: 1,
  total_size: 123,
}

describe('admin shares page', () => {
  beforeEach(() => {
    dataRef.value = [sampleShare]
    refreshMock.mockReset()
    addToast.mockReset()
    fetchMock.mockReset()
  })

  it('deletes a share and refreshes the list', async () => {
    fetchMock.mockResolvedValue({ success: true })
    const wrapper = await mountSuspended(AdminSharesPage, {
      global: {
        stubs: {
          UContainer: uiStub,
          UCard: uiStub,
          UButton: buttonStub,
          UIcon: true,
          USkeleton: true,
          UModal: uiStub,
        },
      },
    })

    await wrapper.get('[data-test="share-delete-button"]').trigger('click')
    await wrapper.get('[data-test="confirm-delete-button"]').trigger('click')

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/shares/42', { method: 'DELETE' })
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Crate deleted',
      color: 'success',
    }))
    expect(refreshMock).toHaveBeenCalledOnce()
  })

  it('shows the server error when deletion returns 404', async () => {
    fetchMock.mockRejectedValue({
      data: { message: 'Share not found' },
    })
    const wrapper = await mountSuspended(AdminSharesPage, {
      global: {
        stubs: {
          UContainer: uiStub,
          UCard: uiStub,
          UButton: buttonStub,
          UIcon: true,
          USkeleton: true,
          UModal: uiStub,
        },
      },
    })

    await wrapper.get('[data-test="share-delete-button"]').trigger('click')
    await wrapper.get('[data-test="confirm-delete-button"]').trigger('click')

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/shares/42', { method: 'DELETE' })
      expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Failed to delete Crate',
        description: 'Share not found',
        color: 'error',
      }))
    })
  })
})