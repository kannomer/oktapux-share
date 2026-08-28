import { describe, expect, it } from 'vitest'
import useCreateFileDownloadUrl from '../../../app/composables/useCreateFileDownloadUrl'

describe('useCreateFileDownloadUrl', () => {
  it('never embeds a share password in the download URL', () => {
    const createUrl = useCreateFileDownloadUrl()
    expect(createUrl('share-token', 42)).toBe(`${window.location.origin}/api/shares/share-token/files/42`)
  })
})
