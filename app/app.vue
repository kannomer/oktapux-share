<template>
  <UApp>
    <NuxtRouteAnnouncer />

    <UHeader :ui="{ container: 'px-4 max-w-none' }" class="font-redaction-35">
      <template #left>
        <a href="/" class="text-3xl">
              {{ config?.site_name || "Oktapux" }}
        </a>
      </template>
	  <template #right>
		<UTooltip text="Site Config">
			<UButton to="/admin" icon="i-lucide-cog" color="neutral" variant="soft" />
		</UTooltip>
		<UDropdownMenu v-if="config?.allow_reverse_shares" :items="items">
			<UButton icon="i-lucide-menu" color="neutral" variant="soft" />
		</UDropdownMenu>
	  </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <p class="text-muted text-sm font-redaction-20">
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
import type { DropdownMenuItem } from '@nuxt/ui';
const { data: config } = await useSiteConfig()

const items = ref<DropdownMenuItem[][]>([
	[
		{
			label: "Share",
			icon: "i-lucide-share",
			to: "/"
		},
		{
			label: "Reverse Share",
			icon: "i-lucide-folder-up",
			to: "/request"
		}
	]
])
</script>