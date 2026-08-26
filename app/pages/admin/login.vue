<template>
  <UContainer class="w-full pt-8 px-4 sm:px-6 lg:px-8 font-redaction text-lg text-white">
        <p class="font-redaction-35 uppercase text-4xl text-center mb-2">Admin login</p>
        <p class="text-lg text-white/80 text-center mb-5">Sign in to manage this instance's settings.</p>

      <div class="flex flex-col gap-2 mt-2">
        <UInput
		v-model="username"
		placeholder="Username"
		size="xl"
		icon="i-lucide-user"
		color="neutral"
		class="mb-2"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
			leadingIcon: 'text-white/35'
  		}"
		@keyup.enter="submit" />
        <UInput 
		v-model="password"
		type="password"
		placeholder="Password"
		size="xl"
		icon="i-lucide-lock"
		color="neutral"
		class="mb-5"
		:ui="{
    		base: 'bg-bg text-white placeholder:text-white/70 ring ring-inset ring-white/35',
			leadingIcon: 'text-white/35'
  		}"
		@keyup.enter="submit" />
      </div>
      <p v-if="errorMessage" class="text-xs text-error mt-2">{{ errorMessage }}</p>

        <div class="flex justify-center w-full">
          <UButton label="Log in" size="xl" color="neutral" class="text-xl" :loading="isLoading" @click="submit" />
        </div>
  </UContainer>
</template>

<script setup lang="ts">
const { loggedIn, fetch: refreshSession } = useUserSession()

// Already logged in? No need to see the login form.
if (loggedIn.value) {
  await navigateTo('/admin')
}

const username = ref("")
const password = ref("")
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const submit = async () => {
  isLoading.value = true
  errorMessage.value = null
  try {
    await $fetch('/api/admin/login', {
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
    errorMessage.value = err?.data?.message ?? 'Invalid credentials'
  } finally {
    isLoading.value = false
  }
}
</script>
