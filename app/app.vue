<template>
  <UApp>
    <NuxtRouteAnnouncer />

    <UHeader :ui="{ container: 'px-4 max-w-none' }">
      <template #left>
        <a href="/">
          <div class="flex items-center gap-2">
              <img src="/logo_circle.svg" class="w-8 h-8" />
              <span class="font-bold text-lg">{{ config?.site_name || "Oktapux" }}</span>
          </div>
        </a>
      </template>
	  <template #right>
		<UTooltip :content="{ side: 'left' }" text="Site Config">
			<UButton to="/admin" icon="i-lucide-cog" color="neutral" variant="soft" />
		</UTooltip>
	  </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <p class="text-muted text-sm">
        Powered by
		<UButton to="https://github.com/kannomer/oktapux-share" target="_blank" class="hover:text-white text-blue-400" variant="link">
			Oktapux Share
		</UButton>
      </p>
    </UFooter>

    <UToaster />
  </UApp>
</template>
<script setup lang="ts">
const { data: config } = await useSiteConfig()
</script>