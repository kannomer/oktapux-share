import { defineComponent, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { configRef, addToast, handleSubmitMock } = vi.hoisted(() => ({
  configRef: { value: null as Record<string, unknown> | null },
  addToast: vi.fn(),
  handleSubmitMock: vi.fn(),
}))

mockNuxtImport('useSiteConfig', () => () => ({ data: configRef }))
mockNuxtImport('useToast', () => () => ({ add: addToast }))
mockNuxtImport('useFormatSize', () => () => (bytes: number) => `${bytes} B`)
mockNuxtImport('useComputeExpiryDate', () => () => ({
  computedExpiryDate: ref('2026-01-01T00:00:00.000Z'),
}))
mockNuxtImport('useHandleSubmit', () => () => ({
  handleSubmit: handleSubmitMock,
  shareUrl: ref(null),
  isShareModalOpen: ref(false),
  submittedInfo: ref(null),
}))
mockNuxtImport('useCopyToClipboard', () => () => ({
  copyToClipboard: vi.fn(),
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr'),
  },
}))

vi.stubGlobal('definePageMeta', vi.fn())

const passthrough = defineComponent({
  inheritAttrs: false,
  template: '<div><slot name="header" /><slot name="body" /><slot /><slot name="footer" /></div>',
})

const buttonStub = defineComponent({
  props: {
    label: { type: String, default: '' },
  },
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')">{{ label }}<slot /></button>',
})

const fileUploadStub = defineComponent({
  props: {
    modelValue: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  template: '<div data-test="file-upload"></div>',
})

const modalStub = defineComponent({
  props: {
    open: Boolean,
  },
  template: '<div v-if="open"><slot name="body" /><slot name="footer" /></div>',
})

const childModalStub = defineComponent({
  template: '<div data-test="share-expiration-modal"><slot /></div>',
})

const qrModalStub = defineComponent({
  template: '<div data-test="share-qr-modal"><slot /></div>',
})

const { default: IndexPage } = await import('./index.vue')

describe('index page', () => {
  beforeEach(() => {
    addToast.mockReset()
    handleSubmitMock.mockReset()
    configRef.value = {
      site_name: 'Oktapux Share',
      max_file_size: 1024,
      allow_passwordless_shares: true,
      enable_qr_code: true,
    }
  })

  const mountPage = () =>
    mountSuspended(IndexPage, {
      global: {
        stubs: {
          UContainer: passthrough,
          UCard: passthrough,
          UButton: buttonStub,
          UFileUpload: fileUploadStub,
          UModal: modalStub,
          UInput: passthrough,
          ShareExpirationModal: childModalStub,
          ShareQrModal: qrModalStub,
        },
      },
    })

  it('shows a warning when sharing without selecting files', async () => {
    const wrapper = await mountPage()

    await wrapper.get('button').trigger('click')

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'No files selected',
      color: 'warning',
    }))
  })

  it('shows an error when a selected file exceeds the server limit', async () => {
    configRef.value!.max_file_size = 4
    const wrapper = await mountPage()
    const upload = wrapper.findComponent(fileUploadStub)
    upload.vm.$emit('update:modelValue', [new File(['12345'], 'too-big.txt')])

    await wrapper.get('button').trigger('click')

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'File too large',
      color: 'error',
    }))
  })

  it('opens the expiration modal when the selected files are valid', async () => {
    const wrapper = await mountPage()
    const upload = wrapper.findComponent(fileUploadStub)
    upload.vm.$emit('update:modelValue', [new File(['ok'], 'ok.txt')])

    await wrapper.get('button').trigger('click')

    expect((wrapper.vm as unknown as { isModalOpen: boolean }).isModalOpen).toBe(true)
  })
})
