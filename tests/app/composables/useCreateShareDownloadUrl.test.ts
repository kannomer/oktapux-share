import { describe, expect, it } from 'vitest'
import useCreateShareDownloadUrl from '../../../app/composables/useCreateShareDownloadUrl'

describe('useCreateShareDownloadUrl', () => {
  it('never embeds a share password in the download URL', () => {
    const url = useCreateShareDownloadUrl('share-token')
    expect(url.value).toBe(`${window.location.origin}/api/shares/share-token/download`)
  })
})
