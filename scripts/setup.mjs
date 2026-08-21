import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

const envExamplePath = resolve(projectRoot, '.env.example')
const envPath = resolve(projectRoot, '.env')

if (!existsSync(envPath)) {
  let env = readFileSync(envExamplePath, 'utf8')

  env = env.replace(
    /^ENCRYPTION_KEY_SECRET=.*$/m,
    `ENCRYPTION_KEY_SECRET=${randomBytes(32).toString('hex')}`,
  )

  env = env.replace(
    /^NUXT_SESSION_PASSWORD=.*$/m,
    `NUXT_SESSION_PASSWORD=${randomBytes(32).toString('hex')}`,
  )

  writeFileSync(envPath, env)

  console.log('Created .env with fresh development secrets.')
} else {
  console.log('.env already exists; leaving it unchanged.')
}

const drizzleKitPath = resolve(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'drizzle-kit.cmd' : 'drizzle-kit',
)

if (!existsSync(drizzleKitPath)) {
  console.error('Could not find the local drizzle-kit executable.')
  console.error('Run "pnpm install" first.')
  process.exit(1)
}

const runDrizzle = (command) => {
  if (process.platform === 'win32') {
    execSync(`"${drizzleKitPath}" ${command}`, {
      cwd: projectRoot,
      stdio: 'inherit',
    })
  } else {
    execFileSync(drizzleKitPath, [command], {
      cwd: projectRoot,
      stdio: 'inherit',
    })
  }
}

runDrizzle('generate')
runDrizzle('migrate')

console.log('Database setup completed successfully.')