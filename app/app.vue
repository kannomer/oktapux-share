<template>
  <UApp>
    <NuxtRouteAnnouncer />

    <UHeader :ui="{ container: 'px-4 max-w-none', root: 'border-b border-border' }" class="font-redaction-35 bg-bg" :toggle="false">
      <template #left>
        <a href="/" class="text-3xl">
              {{ config?.site_name || "Crateyard" }}
        </a>
      </template>
	  <template #right>
		<UTooltip text="Site Config">
			<UButton to="/admin" icon="i-lucide-cog" color="neutral" />
		</UTooltip>
		<UDropdownMenu v-if="config?.allow_reverse_shares" :items="items">
			<UButton icon="i-lucide-menu" color="neutral" />
		</UDropdownMenu>
	  </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <p class="text-white/65 text-sm font-redaction-20">
        Powered by
		<UButton to="https://github.com/kannomer/oktapux-share" target="_blank" class="hover:text-white text-blue-400" variant="link">
			Crateyard
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
			label: "Pack a Crate",
			icon: "i-lucide-share",
			to: "/"
		},
		{
			label: "File collection",
			icon: "i-lucide-folder-up",
			to: "/request"
		}
	]
])
</script>