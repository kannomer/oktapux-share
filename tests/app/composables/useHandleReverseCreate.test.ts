import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { addToast, fetchMock } = vi.hoisted(() => ({
  addToast: vi.fn(),
  fetchMock: vi.fn(),
}))

mockNuxtImport('useToast', () => () => ({ add: addToast }))
mockNuxtImport('$fetch', () => fetchMock)

const makeForm = () => ({
  isPermanent: ref(false),
  expiryAmount: ref(2),
  expiryUnit: ref('day'),
  computedExpiryDate: ref('2026-01-03T00:00:00.000Z'),
  shareName: ref('Inbox'),
  shareDescription: ref('Send files here'),
  sharePassword: ref('secret'),
})

describe('useHandleReverseCreate', () => {
  beforeEach(() => {
    addToast.mockReset()
    fetchMock.mockReset()
  })

  it('creates the owner and collection URLs and resets the form', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://example.com' } })
    fetchMock.mockResolvedValue({ token: 'owner', upload_token: 'upload' })
    const form = makeForm()
    const { handleReverseCreate, isReverseShareModalOpen, ownerUrl, collectionUrl } = useHandleReverseCreate(form)
    const closeModal = vi.fn()

    await handleReverseCreate(closeModal)

    expect(ownerUrl.value).toBe('https://example.com/s/owner')
    expect(collectionUrl.value).toBe('https://example.com/r/upload')
    expect(isReverseShareModalOpen.value).toBe(true)
    expect(closeModal).toHaveBeenCalledOnce()
    expect(form.shareName.value).toBe('')
    expect(form.sharePassword.value).toBe('')
  })

  it('shows a toast when reverse creation fails', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    const { handleReverseCreate } = useHandleReverseCreate(makeForm())

    await handleReverseCreate(vi.fn())

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Failed to create Collection',
      color: 'error',
    }))
  })
})
