<template>
  <UContainer class="w-full pt-8 px-4 sm:px-6 lg:px-8 font-redaction text-lg">
        <p class="font-redaction-35 text-center uppercase text-4xl">Set up Crateyard</p>
        <p class="text-lg text-white/80 text-center mb-10">Create the admin account to finish setting up this instance.</p>

      <div class="flex flex-col gap-2 mb-10">
        <UInput
		v-model="username"
		placeholder="Username"
		icon="i-lucide-user"
		color="neutral"
		size="lg"
		class="mb-2"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
			leadingIcon: 'text-white/35'
  		}" />
        <UInput
		v-model="password"
		type="password"
		placeholder="Password"
		icon="i-lucide-lock"
		color="neutral"
		size="lg"
		class="mb-2"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
			leadingIcon: 'text-white/35'
  		}" />
        <UInput
		v-model="confirmPassword"
		type="password"
		placeholder="Confirm password"
		icon="i-lucide-lock" 
		color="neutral"
		size="lg"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
			leadingIcon: 'text-white/35'
  		}" />
      </div>

      <div v-if="password && !strength.isStrong" class="mt-3">
        <p class="text-sm text-warning mb-1">Your password is missing:</p>
        <ul class="text-sm text-white/80 list-disc list-inside">
          <li v-for="issue in strength.issues" :key="issue">{{ issue }}</li>
        </ul>
        <UButton
          v-if="!bypassStrength"
          label="Use this password anyway"
          variant="link"
          size="sm"
          color="neutral"
          class="px-0 mt-1 text-white/80 text-sm"
          @click="() => { bypassStrength = true }"
        />
      </div>

      <p v-if="passwordConfirmationMissing" class="text-sm text-warning mt-2">Please confirm your password</p>
      <p v-else-if="passwordsMismatch" class="text-sm text-error mt-2">Passwords don't match</p>

        <div class="flex justify-center w-full">
          <UButton
            label="Create admin account"
            size="xl"
            color="neutral"
			class="text-xl"
            :loading="isLoading"
            :disabled="!canSubmit"
            @click="submit"
          />
        </div>
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

const passwordsMismatch = computed(() =>
  confirmPassword.value.length > 0 && password.value !== confirmPassword.value
)

const passwordConfirmationMissing = computed(() =>
  password.value.length > 0 && confirmPassword.value.length === 0
)

const canSubmit = computed(() =>
  username.value.trim().length > 0 &&
  password.value.length > 0 &&
  confirmPassword.value.length > 0 &&
  !passwordsMismatch.value &&
  (strength.value.isStrong || bypassStrength.value)
)

const toast = useToast()
const { fetch: refreshSession } = useUserSession()

const submit = async () => {
  if (!canSubmit.value || isLoading.value) return

  isLoading.value = true

  try {
    await $fetch('/api/setup', {
      method: 'POST',
      body: {
        username: username.value.trim(),
        password: password.value,
        confirmPassword: confirmPassword.value
      }
    })
  } catch (error) {
    const err = error as {
      data?: {
        message?: string
      }
    }

    toast.add({
      title: 'Setup failed',
      description: err?.data?.message ?? 'Please try again.',
      color: 'error'
    })

    return
  } finally {
    isLoading.value = false
  }

  // /api/setup succeeded. Setup is complete.
  //
  // These are intentionally outside the setup error handler so a
  // session/navigation problem cannot falsely report that setup failed.
  try {
    await refreshSession()
  } catch (error) {
    console.error(
      'Setup completed, but session refresh failed',
      error
    )
  }

  await navigateTo('/admin')
}
</script>
