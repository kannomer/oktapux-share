import { defineComponent, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { routeRef, dataRef, errorRef, refreshMock, addToast, fetchMock } = vi.hoisted(() => ({
  routeRef: { value: { params: { uploadToken: 'upload-token' } } },
  dataRef: { value: null as Record<string, unknown> | null },
  errorRef: { value: null as { status?: number } | null },
  refreshMock: vi.fn(),
  addToast: vi.fn(),
  fetchMock: vi.fn(),
}))

mockNuxtImport('useRoute', () => () => routeRef.value)
mockNuxtImport('useFetch', () => async () => ({
  data: dataRef,
  error: errorRef,
  pending: ref(false),
  refresh: refreshMock,
}))
mockNuxtImport('useToast', () => () => ({ add: addToast }))
mockNuxtImport('$fetch', () => fetchMock)

const passthrough = defineComponent({
  inheritAttrs: false,
  template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /><slot /></div>',
})

const inputStub = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

const fileUploadStub = defineComponent({
  emits: ['update:modelValue'],
  template: '<div data-test="file-upload" />',
})

const buttonStub = defineComponent({
  props: { label: { type: String, default: '' } },
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
})

const { default: ReverseUploadPage } = await import('./[uploadToken].vue')

describe('reverse upload page', () => {
  beforeEach(() => {
    routeRef.value = { params: { uploadToken: 'upload-token' } }
    dataRef.value = null
    errorRef.value = null
    refreshMock.mockReset()
    addToast.mockReset()
    fetchMock.mockReset()
  })

  const mountPage = () => mountSuspended(ReverseUploadPage, {
    global: {
      stubs: {
        UContainer: passthrough,
        UCard: passthrough,
        UInput: inputStub,
        UFileUpload: fileUploadStub,
        UButton: buttonStub,
        UIcon: true,
        USkeleton: true,
      },
    },
  })

  it('shows a friendly message when the request does not exist', async () => {
    errorRef.value = { status: 404 }
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("This link doesn't exist")
  })

  it('shows the password screen for a protected request', async () => {
    errorRef.value = { status: 401 }
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Password required')
  })

  it('warns when submitting without files', async () => {
    dataRef.value = { name: 'Collect files', description: null }
    const wrapper = await mountPage()

    await wrapper.get('button').trigger('click')

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'No files selected',
      color: 'warning',
    }))
  })

  it('submits selected files and shows the success state', async () => {
    dataRef.value = { name: 'Collect files', description: 'Send your files here' }
    fetchMock.mockResolvedValue({ success: true, count: 1 })
    const wrapper = await mountPage()
    const upload = wrapper.findComponent(fileUploadStub)

    upload.vm.$emit('update:modelValue', [new File(['hello'], 'hello.txt')])
    await wrapper.get('button').trigger('click')

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/reverse/upload-token', expect.objectContaining({ method: 'POST' }))
    })
    expect(wrapper.text()).toContain('Thanks, your files were submitted')
  })
})
