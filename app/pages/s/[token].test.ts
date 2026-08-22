import { defineComponent, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { routeRef, dataRef, errorRef, refreshMock, copyMock, fetchMock } = vi.hoisted(() => ({
  routeRef: { value: { params: { token: 'share-token' } } },
  dataRef: { value: null as Record<string, unknown> | null },
  errorRef: { value: null as { statusCode?: number } | null },
  refreshMock: vi.fn(),
  copyMock: vi.fn(),
  fetchMock: vi.fn(),
}))

mockNuxtImport('useRoute', () => () => routeRef.value)
mockNuxtImport('useFetch', () => async () => ({
  data: dataRef,
  error: errorRef,
  pending: ref(false),
  refresh: refreshMock,
}))
mockNuxtImport('$fetch', () => fetchMock)
mockNuxtImport('useCreateFileDownloadUrl', () => () => (token: string, id: number) => `/download/${token}/${id}`)
mockNuxtImport('useCreateShareDownloadUrl', () => (token: string) => `/share/${token}`)
mockNuxtImport('useCopyToClipboard', () => () => ({ copyToClipboard: copyMock }))
mockNuxtImport('useFormatSize', () => () => (bytes: number) => `${bytes} B`)

const passthrough = defineComponent({
  inheritAttrs: false,
  template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /><slot /></div>',
})

const inputStub = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

const buttonStub = defineComponent({
  props: { label: { type: String, default: '' } },
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
})

const { default: SharePage } = await import('./[token].vue')

describe('share page', () => {
  beforeEach(() => {
    routeRef.value = { params: { token: 'share-token' } }
    dataRef.value = null
    errorRef.value = null
    refreshMock.mockReset()
    copyMock.mockReset()
    fetchMock.mockReset()
  })

  const mountPage = () => mountSuspended(SharePage, {
    global: {
      stubs: {
        UContainer: passthrough,
        UCard: passthrough,
        UInput: inputStub,
        UButton: buttonStub,
        UIcon: true,
        UTooltip: passthrough,
        USkeleton: true,
      },
    },
  })

  it('shows the password screen for a protected share', async () => {
    errorRef.value = { statusCode: 401 }
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Password required')
    expect(wrapper.text()).toContain('Unlock')
  })

  it('shows a friendly message for an expired share', async () => {
    errorRef.value = { statusCode: 410 }
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('This share has expired')
  })

  it('retries a protected share with the entered password', async () => {
    errorRef.value = { statusCode: 401 }
    const wrapper = await mountPage()

    const passwordInput = wrapper.get('input')
    await passwordInput.setValue('secret123')
    fetchMock.mockResolvedValue({ success: true })
    await wrapper.get('button').trigger('click')

    expect(fetchMock).toHaveBeenCalledWith('/api/shares/share-token', {
      headers: { 'x-share-password': 'secret123' },
    })
    expect(refreshMock).toHaveBeenCalledOnce()
  })

  it('renders share details and files for an accessible share', async () => {
    dataRef.value = {
      share: {
        name: 'Project files',
        description: 'Files for review',
        is_reverse: false,
        upload_token: null,
        expires_at: null,
        max_downloads: null,
        download_count: 0,
      },
      files: [{ id: 1, original_name: 'readme.txt', size: 12 }],
    }

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Project files')
    expect(wrapper.text()).toContain('Files for review')
    expect(wrapper.text()).toContain('readme.txt')
    expect(wrapper.text()).toContain('12 B')
  })
})
