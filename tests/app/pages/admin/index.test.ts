import { defineComponent, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { configRef, refreshMock, addToast, fetchMock, clearMock, navigateToMock } = vi.hoisted(() => ({
  configRef: { value: null as Record<string, unknown> | null },
  refreshMock: vi.fn(),
  addToast: vi.fn(),
  fetchMock: vi.fn(),
  clearMock: vi.fn(),
  navigateToMock: vi.fn(),
}))

mockNuxtImport('useSiteConfig', () => () => ({
  data: ref(configRef.value),
  pending: ref(false),
  refresh: refreshMock,
}))
mockNuxtImport('useToast', () => () => ({ add: addToast }))
mockNuxtImport('useFetch', () => () => ({ data: ref(null), pending: ref(false), refresh: refreshMock }))
mockNuxtImport('$fetch', () => fetchMock)
mockNuxtImport('useUserSession', () => () => ({ clear: clearMock }))
mockNuxtImport('navigateTo', () => navigateToMock)

vi.stubGlobal('definePageMeta', vi.fn())

const containerStub = defineComponent({
  template: '<div><slot /></div>',
})

const buttonStub = defineComponent({
  props: {
    label: { type: String, default: '' },
  },
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
})

const { default: AdminPage } = await import('../../../../app/pages/admin/index.vue')

const sampleSettings = {
  site_name: 'Crateyard',
  max_file_size: 1024,
  allow_passwordless_shares: true,
  allow_permanent_shares: true,
  allow_reverse_shares: true,
  max_expiry_days: null,
  enable_qr_code: true,
}

describe('admin page', () => {
  beforeEach(() => {
    configRef.value = sampleSettings
    refreshMock.mockReset()
    addToast.mockReset()
    fetchMock.mockReset()
    clearMock.mockReset()
    navigateToMock.mockReset()
  })

  const mountPage = () => mountSuspended(AdminPage, {
    global: {
      stubs: {
        UContainer: containerStub,
        UCard: containerStub,
        UButton: buttonStub,
        USkeleton: true,
        SettingsForm: defineComponent({
          props: {
            settings: { type: Object, required: true },
          },
          emits: ['save'],
          template: '<button data-test="save" type="button" @click="$emit(\'save\', settings)">Save</button>',
        }),
      },
    },
  })

  it('saves settings and refreshes the configuration', async () => {
    fetchMock.mockResolvedValue({ success: true })
    const wrapper = await mountPage()

    await wrapper.get('[data-test="save"]').trigger('click')

    expect(fetchMock).toHaveBeenCalledWith('/api/config', {
      method: 'PATCH',
      body: sampleSettings,
    })
    expect(refreshMock).toHaveBeenCalledOnce()
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Settings saved',
      color: 'success',
    }))
  })

  it('shows the server error when saving settings fails', async () => {
    fetchMock.mockRejectedValue({ data: { message: 'Invalid settings' } })
    const wrapper = await mountPage()

    await wrapper.get('[data-test="save"]').trigger('click')

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Failed to save settings',
      description: 'Invalid settings',
      color: 'error',
    }))
  })
})
