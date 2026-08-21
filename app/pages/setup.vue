<template>
  <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
    <UCard class="w-full" variant="subtle">
      <template #header>
        <p class="font-semibold">Set up Oktapux Share</p>
        <p class="text-sm text-muted mt-1">Create the admin account to finish setting up this instance</p>
      </template>

      <div class="flex flex-col gap-2 mt-2">
        <UInput v-model="username" placeholder="Username" icon="i-lucide-user" />
        <UInput v-model="password" type="password" placeholder="Password" icon="i-lucide-lock" />
        <UInput v-model="confirmPassword" type="password" placeholder="Confirm password" icon="i-lucide-lock" />
      </div>

      <div v-if="password && !strength.isStrong" class="mt-3">
        <p class="text-xs text-warning mb-1">Your password is missing:</p>
        <ul class="text-xs text-muted list-disc list-inside">
          <li v-for="issue in strength.issues" :key="issue">{{ issue }}</li>
        </ul>
        <UButton
          v-if="!bypassStrength"
          label="Use this password anyway"
          variant="link"
          size="xs"
          color="neutral"
          class="px-0 mt-1"
          @click="() => { bypassStrength = true }"
        />
      </div>

      <p v-if="passwordsMismatch" class="text-xs text-error mt-2">Passwords don't match</p>

      <template #footer>
        <div class="flex justify-center w-full">
          <UButton
            label="Create admin account"
            icon="i-lucide-shield-check"
            size="xl"
            color="neutral"
            :loading="isLoading"
            :disabled="!canSubmit"
            @click="submit"
          />
        </div>
      </template>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
const username = ref("")
const password = ref("")
const confirmPassword = ref("")
const bypassStrength = ref(false)
const isLoading = ref(false)

const checkStrength = useCheckPasswordStrength()
const strength = computed(() => checkStrength(password.value))
const passwordsMismatch = computed(() => confirmPassword.value.length > 0 && password.value !== confirmPassword.value)

const canSubmit = computed(() =>
  username.value.length > 0 &&
  password.value.length > 0 &&
  !passwordsMismatch.value &&
  (strength.value.isStrong || bypassStrength.value)
)

const toast = useToast()
const { fetch: refreshSession } = useUserSession()

const submit = async () => {
  isLoading.value = true
  try {
    await $fetch('/api/setup', {
      method: 'POST',
      body: { username: username.value, password: password.value }
    })
    await refreshSession()
    await navigateTo('/admin')
  } catch (error) {
	const err = error as {
		data?: {
			message?: string
		}
	}
    toast.add({ title: 'Setup failed', description: err?.data?.message ?? 'Please try again.', color: 'error' })
  } finally {
    isLoading.value = false
  }
}
</script>
