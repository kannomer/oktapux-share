interface ReverseFormState {
  isPermanent: Ref<boolean>
  expiryAmount: Ref<number>
  expiryUnit: Ref<string>
  computedExpiryDate: ComputedRef<string> | Ref<string>
  shareName: Ref<string>
  shareDescription: Ref<string>
  sharePassword: Ref<string>
}

interface SubmittedReverseInfo {
  isPermanent: boolean
  expiryDate: string | null
  isPasswordProtected: boolean
}

export default function (form: ReverseFormState) {
  const toast = useToast()

  const isLoading = ref(false)
  const ownerUrl = ref<string | null>(null)
  const collectionUrl = ref<string | null>(null)
  const isReverseShareModalOpen = ref(false)
  const submittedInfo = ref<SubmittedReverseInfo | null>(null)

  const resetForm = () => {
    form.isPermanent.value = false
    form.expiryAmount.value = 1
    form.expiryUnit.value = 'day'
    form.shareName.value = ""
    form.shareDescription.value = ""
    form.sharePassword.value = ""
  }

  const handleReverseCreate = async (closeModal: () => void) => {
    isLoading.value = true
    ownerUrl.value = null
    collectionUrl.value = null

    const body: Record<string, unknown> = {
      expiry_type: form.isPermanent.value ? 'permanent' : 'date'
    }
    if (!form.isPermanent.value) {
      body.expires_at = form.computedExpiryDate.value
    }
    if (form.shareName.value) body.name = form.shareName.value
    if (form.shareDescription.value) body.description = form.shareDescription.value
    if (form.sharePassword.value) body.password = form.sharePassword.value

    try {
      const response = await $fetch<{ token: string, upload_token: string }>('/api/reverse', {
        method: 'POST',
        body
      })

      submittedInfo.value = {
        isPermanent: form.isPermanent.value,
        expiryDate: form.isPermanent.value ? null : form.computedExpiryDate.value,
        isPasswordProtected: !!form.sharePassword.value
      }

      ownerUrl.value = `${window.location.origin}/s/${response.token}`
      collectionUrl.value = `${window.location.origin}/r/${response.upload_token}`

      resetForm()
      closeModal()
      isReverseShareModalOpen.value = true
    } catch (error: any) {
      toast.add({ title: 'Failed to create request', description: 'Please try again later.', color: 'error' })
      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  return {
    handleReverseCreate,
    isLoading,
    ownerUrl,
    collectionUrl,
    isReverseShareModalOpen,
    submittedInfo
  }
}
