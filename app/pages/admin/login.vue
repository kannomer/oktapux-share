<template>
  <UContainer class="flex justify-center pt-8 w-full max-w-2xl">
    <UCard class="w-full" variant="subtle">
      <template #header>
        <p class="font-semibold">Admin login</p>
        <p class="text-sm text-muted mt-1">Sign in to manage this instance's settings</p>
      </template>

      <div class="flex flex-col gap-2 mt-2">
        <UInput v-model="username" placeholder="Username" icon="i-lucide-user" @keyup.enter="submit" />
        <UInput v-model="password" type="password" placeholder="Password" icon="i-lucide-lock" @keyup.enter="submit" />
      </div>
      <p v-if="errorMessage" class="text-xs text-error mt-2">{{ errorMessage }}</p>

      <template #footer>
        <div class="flex justify-center w-full">
          <UButton label="Log in" icon="i-lucide-log-in" size="xl" color="neutral" :loading="isLoading" @click="submit" />
        </div>
      </template>
    </UCard>
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
  } catch (error: any) {
    errorMessage.value = error?.data?.message ?? 'Invalid credentials'
  } finally {
    isLoading.value = false
  }
}
</script>
