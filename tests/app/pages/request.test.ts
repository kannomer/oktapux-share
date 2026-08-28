import { defineComponent, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { configRef, addToast } = vi.hoisted(() => ({
  configRef: { value: null as Record<string, unknown> | null },
  addToast: vi.fn(),
}))

mockNuxtImport('useSiteConfig', () => () => ({ data: ref(configRef.value) }))
mockNuxtImport('useToast', () => () => ({ add: addToast }))
mockNuxtImport('useComputeExpiryDate', () => () => ({
  computedExpiryDate: ref('2026-08-23T00:00:00.000Z'),
}))
mockNuxtImport('useHandleReverseCreate', () => () => ({
  handleReverseCreate: vi.fn(),
  isLoading: ref(false),
  ownerUrl: ref(null),
  collectionUrl: ref(null),
  isReverseShareModalOpen: ref(false),
  submittedInfo: ref(null),
}))
mockNuxtImport('useCopyToClipboard', () => () => ({ copyToClipboard: vi.fn() }))

const passthrough = defineComponent({
  template: '<div><slot name="body" /><slot name="footer" /><slot /></div>',
})

const modalStub = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot name="body" /><slot name="footer" /></div>',
})

const buttonStub = defineComponent({
  props: { label: { type: String, default: '' } },
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
})

const { default: RequestPage } = await import('../../../app/pages/request.vue')

describe('request page', () => {
  beforeEach(() => {
    addToast.mockReset()
    configRef.value = {
      allow_reverse_shares: true,
      allow_passwordless_shares: true,
      allow_permanent_shares: true,
      max_expiry_days: 7,
    }
  })

  const mountPage = () => mountSuspended(RequestPage, {
    global: {
      stubs: {
        UContainer: passthrough,
        UCard: passthrough,
        UButton: buttonStub,
        UModal: modalStub,
        UInput: true,
        UInputNumber: true,
        USelect: true,
        USwitch: true,
        USeparator: true,
        UTextarea: true,
        UIcon: true,
      },
    },
  })

  it('warns when reverse shares are disabled', async () => {
    configRef.value!.allow_reverse_shares = false
    const wrapper = await mountPage()

    await wrapper.get('button').trigger('click')

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reverse shares disabled',
      color: 'warning',
    }))
  })

  it('warns when a password is required but missing', async () => {
    configRef.value!.allow_passwordless_shares = false
    const wrapper = await mountPage()

    ;(wrapper.vm as unknown as { openReverseModal: () => void }).openReverseModal()
    ;(wrapper.vm as unknown as { attemptReverseCreate: () => void }).attemptReverseCreate()

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Password required',
      color: 'warning',
    }))
  })
})
