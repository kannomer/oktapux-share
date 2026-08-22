import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ShareExpirationModal from './ShareExpirationModal.vue'

const modalStub = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<section><slot name="body" /><slot name="footer" /></section>',
})

const buttonStub = defineComponent({
  emits: ['click'],
  template: '<button data-test="submit" type="button" @click="$emit(\'click\')"><slot /></button>',
})

describe('ShareExpirationModal', () => {
  it('renders the share form and emits submit from its upload action', async () => {
    const wrapper = mount(ShareExpirationModal, {
      props: {
        open: true,
        expiryType: 'date',
        isPermanent: false,
        expiryAmount: 1,
        expiryUnit: 'day',
        maxDownloads: 1,
        shareName: '',
        shareDescription: '',
        shareSecretInput: '',
        shareSlug: '',
        config: {
          allow_permanent_shares: true,
          allow_passwordless_shares: true,
          max_expiry_days: 7,
        },
      },
      global: {
        stubs: {
          UModal: modalStub,
          UButton: buttonStub,
          URadioGroup: true,
          UInputNumber: true,
          USelect: true,
          USwitch: true,
          USeparator: true,
          UInput: true,
          UTextarea: true,
        },
      },
    })

    const submitButton = wrapper.get('[data-test="submit"]')
    await submitButton.trigger('click')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })
})
