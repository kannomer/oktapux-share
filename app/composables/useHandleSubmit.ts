import type { FetchError } from 'ofetch'

interface ShareFormState {
  files: Ref<File[]>
  isPermanent: Ref<boolean>
  expiryType: Ref<string>
  expiryAmount: Ref<number>
  expiryUnit: Ref<string>
  maxDownloads: Ref<number>
  computedExpiryDate: ComputedRef<string> | Ref<string>
  shareName: Ref<string>
  shareDescription: Ref<string>
  sharePassword: Ref<string>
  shareSlug: Ref<string>
}

interface SubmittedShareInfo {
  expiryType: string
  maxDownloads: number | null
  expiryDate: string | null
  isPasswordProtected: boolean
}

export default function (form: ShareFormState) {
  const toast = useToast()

  const isLoading = ref(false)
  const shareUrl = ref<string | null>(null)
  const isShareModalOpen = ref(false)
  const submittedInfo = ref<SubmittedShareInfo | null>(null)

  const resetForm = () => {
    form.files.value = []
    form.isPermanent.value = false
    form.expiryType.value = 'date'
    form.expiryAmount.value = 1
    form.expiryUnit.value = 'day'
    form.maxDownloads.value = 1
    form.shareName.value = ''
    form.shareDescription.value = ''
    form.sharePassword.value = ''
    form.shareSlug.value = ''
  }

  const handleSubmit = async (closeExpirationModal: () => void) => {
    isLoading.value = true
    shareUrl.value = null

    const effectiveExpiryType = form.isPermanent.value
      ? 'permanent'
      : form.expiryType.value

    const formData = new FormData()

    form.files.value.forEach(file => {
      formData.append('files', file)
    })

    if (effectiveExpiryType === 'permanent') {
      formData.append('expiry_type', 'permanent')
    } else if (effectiveExpiryType === 'date') {
      formData.append('expiry_type', 'date')
      formData.append('expires_at', form.computedExpiryDate.value)
    } else if (effectiveExpiryType === 'downloads') {
      formData.append('expiry_type', 'downloads')
      formData.append('max_downloads', form.maxDownloads.value.toString())
    }

    if (form.shareName.value) {
      formData.append('name', form.shareName.value)
    }

    if (form.shareDescription.value) {
      formData.append('description', form.shareDescription.value)
    }

    if (form.sharePassword.value) {
      formData.append('password', form.sharePassword.value)
    }

    if (form.shareSlug.value) {
      formData.append('slug', form.shareSlug.value)
    }

    try {
      const response = await $fetch<{ token: string }>('/api/upload', {
        method: 'POST',
        body: formData,
      })

      submittedInfo.value = {
        expiryType: effectiveExpiryType,
        maxDownloads:
          effectiveExpiryType === 'downloads'
            ? form.maxDownloads.value
            : null,
        expiryDate:
          effectiveExpiryType === 'date'
            ? form.computedExpiryDate.value
            : null,
        isPasswordProtected: !!form.sharePassword.value,
      }

      shareUrl.value = `${window.location.origin}/s/${response.token}`

      resetForm()
      closeExpirationModal()
      isShareModalOpen.value = true
    } catch (error) {
      const err = error as FetchError<{ message?: string }>
      const status = err.status ?? err.response?.status

      if (status === 409) {
        toast.add({
          title: 'Upload failed',
          description: 'This URL is taken.',
          color: 'error',
        })
      } else if (status === 400) {
        toast.add({
          title: 'Upload failed',
          description:
            err.data?.message ??
            err.statusMessage ??
            'Invalid upload request',
          color: 'error',
        })
      } else {
        toast.add({
          title: 'Upload failed',
          description: 'Please try again later.',
          color: 'error',
        })
      }

      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  return {
    handleSubmit,
    isLoading,
    shareUrl,
    isShareModalOpen,
    submittedInfo,
  }
}