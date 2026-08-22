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
        'server/api/metrics.get.ts',
        'server/utils/validation.ts',
        'app/composables/useHandleSubmit.ts',
        'app/composables/useHandleReverseCreate.ts',
        'app/composables/useComputeExpiryDate.ts',
        'server/api/config.patch.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 50,
        statements: 70,
      },
    },
  },
})
