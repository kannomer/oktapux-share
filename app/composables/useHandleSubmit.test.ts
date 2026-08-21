import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { addToast, fetchMock } = vi.hoisted(() => ({
  addToast: vi.fn(),
  fetchMock: vi.fn(),
}))

mockNuxtImport('useToast', () => () => ({ add: addToast }))
mockNuxtImport('$fetch', () => fetchMock)

const makeForm = () => ({
  files: ref([new File(['hello'], 'hello.txt')]),
  isPermanent: ref(true),
  expiryType: ref('downloads'),
  expiryAmount: ref(9),
  expiryUnit: ref('month'),
  maxDownloads: ref(7),
  computedExpiryDate: ref('2026-01-01T00:00:00.000Z'),
  shareName: ref('name'),
  shareDescription: ref('description'),
  sharePassword: ref('secret'),
  shareSlug: ref('slug'),
})

describe('useHandleSubmit', () => {
  beforeEach(() => {
    addToast.mockReset()
    fetchMock.mockReset()
  })

  it('resets the form after a successful upload', async () => {
    fetchMock.mockResolvedValue({ token: 'abc123' })
    const form = makeForm()
    const { handleSubmit } = useHandleSubmit(form)
    const closeExpirationModal = vi.fn()

    await handleSubmit(closeExpirationModal)

    expect(form.files.value).toEqual([])
    expect(form.isPermanent.value).toBe(false)
    expect(form.expiryType.value).toBe('date')
    expect(form.expiryAmount.value).toBe(1)
    expect(form.expiryUnit.value).toBe('day')
    expect(form.maxDownloads.value).toBe(1)
    expect(form.shareName.value).toBe('')
    expect(form.shareDescription.value).toBe('')
    expect(form.sharePassword.value).toBe('')
    expect(form.shareSlug.value).toBe('')
    expect(closeExpirationModal).toHaveBeenCalledOnce()
  })

  it('shows the taken-URL toast for a 409 response', async () => {
    fetchMock.mockRejectedValue({ status: 409 })
    const { handleSubmit } = useHandleSubmit(makeForm())

    await handleSubmit(vi.fn())

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Upload failed',
      description: 'This URL is taken.',
      color: 'error',
    }))
  })

  it('shows the validation toast for a 400 response', async () => {
    fetchMock.mockRejectedValue({ response: { status: 400 } })
    const { handleSubmit } = useHandleSubmit(makeForm())

    await handleSubmit(vi.fn())

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Upload failed',
      description: 'The slug should contain only letters, numbers and underscores. Length between 3-50 characters.',
      color: 'error',
    }))
  })

  it('shows the generic toast for unexpected failures', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    const { handleSubmit } = useHandleSubmit(makeForm())

    await handleSubmit(vi.fn())

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Upload failed',
      description: 'Please try again later.',
      color: 'error',
    }))
  })
})
