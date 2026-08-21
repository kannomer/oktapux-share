# Contributing to Oktapux Share

Thanks for contributing.

## Development workflow

The project uses Node.js and pnpm.

```bash
pnpm install
pnpm run setup
pnpm run dev
```

Before opening a pull request, run the same checks as CI:

```bash
pnpm lint
pnpm nuxi typecheck
pnpm run setup
pnpm test:coverage
pnpm audit --prod
```

## Tests

Add a Vitest spec with the feature or fix it verifies. Keep tests close to the code they exercise and prefer focused commits.

For API routes, cover validation and error paths as well as the successful path. For Vue pages and composables, test user-visible behavior and important state transitions.

## Commits

Keep commits small and focused. When a behavior changes, include the test that proves the new behavior in the same commit whenever practical.

## Pull requests

Please describe:

1. What changed.
2. Why it changed.
3. How it was tested.

Do not commit `.env`, generated build directories, local databases, uploads, or `node_modules`.
