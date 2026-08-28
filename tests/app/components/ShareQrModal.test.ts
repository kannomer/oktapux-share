import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ShareQrModal from '../../../app/components/ShareQrModal.vue'

const modalStub = defineComponent({
  props: { open: Boolean, title: String },
  template: '<div v-if="open"><slot name="body" /><slot name="footer" /></div>',
})

const buttonStub = defineComponent({
  props: { label: { type: String, default: '' }, href: { type: String, default: '' } },
  template: '<a :href="href" data-test="download">{{ label }}</a>',
})

describe('ShareQrModal', () => {
  it('renders the QR code and download link when open', () => {
    const wrapper = mount(ShareQrModal, {
      props: {
        open: true,
        qrCodeUrl: 'data:image/png;base64,qr',
      },
      global: {
        stubs: {
          UModal: modalStub,
          UButton: buttonStub,
        },
      },
    })

    expect(wrapper.get('img').attributes('src')).toBe('data:image/png;base64,qr')
    expect(wrapper.get('[data-test="download"]').attributes('href')).toBe('data:image/png;base64,qr')
  })

  it('renders no modal content when there is no QR code', () => {
    const wrapper = mount(ShareQrModal, {
      props: {
        open: true,
        qrCodeUrl: null,
      },
      global: {
        stubs: {
          UModal: modalStub,
          UButton: buttonStub,
        },
      },
    })

    expect(wrapper.find('img').exists()).toBe(false)
  })
})
