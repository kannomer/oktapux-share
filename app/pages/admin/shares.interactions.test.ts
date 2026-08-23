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
  template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
})

const { default: AdminSharesPage } = await import('./shares.vue')

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

describe('admin shares interactions', () => {
  beforeEach(() => {
    dataRef.value = [sampleShare]
    refreshMock.mockReset()
    addToast.mockReset()
    fetchMock.mockReset()
  })

  it('shows the server error message when deletion fails', async () => {
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
      expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Failed to delete share',
        description: 'Share not found',
        color: 'error',
      }))
    })
  })
})
