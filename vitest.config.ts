import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'server/api/upload.post.ts',
        'server/api/reverse/[uploadToken].get.ts',
        'server/api/reverse/[uploadToken].post.ts',
        'server/api/admin/shares/[id].delete.ts',
        'server/api/health.get.ts',
        'server/utils/validation.ts',
        'app/composables/useHandleSubmit.ts',
        'app/composables/useHandleReverseCreate.ts',
        'app/composables/useComputeExpiryDate.ts',
        'app/components/ShareExpirationModal.vue',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
  },
})
