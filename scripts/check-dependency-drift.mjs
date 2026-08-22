import { spawnSync } from 'node:child_process'

const result = spawnSync('pnpm', ['outdated', '--format', 'json'], {
  encoding: 'utf8',
})

const output = (result.stdout ?? '').trim()

if (!output) {
  if (result.status && result.status !== 0) {
    console.error(result.stderr || 'pnpm outdated failed')
    process.exit(result.status)
  }
  console.log('No dependency updates reported.')
  process.exit(0)
}

let data
try {
  data = JSON.parse(output)
} catch {
  console.error('Could not parse `pnpm outdated --format json` output.')
  console.error(output)
  process.exit(1)
}

const packages = []

const visit = (value, name = '') => {
  if (!value || typeof value !== 'object') return

  if (
    typeof value.current === 'string' &&
    typeof value.latest === 'string' &&
    name
  ) {
    packages.push({ name, current: value.current, latest: value.latest })
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) visit(item, name)
    return
  }

  for (const [key, child] of Object.entries(value)) {
    visit(child, key)
  }
}

visit(data)

const majorOf = (version) => {
  const match = version.replace(/^[^0-9]*/, '').match(/^(\d+)/)
  return match ? Number(match[1]) : null
}

const majorDrift = packages.filter(({ current, latest }) => {
  const currentMajor = majorOf(current)
  const latestMajor = majorOf(latest)
  return currentMajor !== null && latestMajor !== null && latestMajor > currentMajor
})

if (majorDrift.length === 0) {
  console.log('No direct major-version dependency drift detected.')
  process.exit(0)
}

console.error('Direct dependencies with available major-version updates:')
for (const dependency of majorDrift) {
  console.error(`- ${dependency.name}: ${dependency.current} -> ${dependency.latest}`)
}

process.exit(1)
