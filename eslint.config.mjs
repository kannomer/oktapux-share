import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt()
  .append({
    ignores: [
      '**/data/**',
      '**/uploads/**',
    ],
  })