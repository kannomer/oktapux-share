<script setup lang="ts"">
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <UHeader :ui="{ container: 'px-4 max-w-none' }">
      <template #left>
        <div class="flex items-center gap-2">
          <img src="/logo_circle.svg" alt="Oktapux logo" class="w-8 h-8" />
          <span class="font-bold text-lg">Oktapux</span>
        </div>
      </template>
    </UHeader>
    <UMain>
      <NuxtPage />
    </UMain>
    <UFooter>
      <template>
        <p class="text-muted text-sm">Powered By <a href="https://github.com/kannomer/oktapux-share" target="_blank"><span class="text-blue-400">Oktapux Share</span></a></p>
      </template>
    </UFooter>
    <UToaster />
  </div>
</template>
