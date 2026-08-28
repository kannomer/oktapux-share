<p align="center">
  <img src="https://raw.githubusercontent.com/kannomer/oktapux-share/refs/heads/main/public/logo_mini.svg" width="120">
</p>

<p align="center">
  <strong>Simple, private, self-hosted file sharing.</strong>
  <br>
  Upload files. Share a link. Set an expiration.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js&logoColor=white" alt="Nuxt 4">
  <img src="https://img.shields.io/badge/SQLite-Drizzle-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
</p>

---

## What is Crateyard?

Crateyard (Formerly Oktapux-Share) is a lightweight, self-hosted alternative to cloud file-sharing services.

Upload one or more files, pack a Crate, optionally protect it with a password, and decide when the link should stop working.

Crateyard uses a single SQLite database and local storage, so you don't need a separate database, object-storage service, or external SaaS account to run it.

Inspired by [Pingvin Share](https://github.com/stonith404/pingvin-share).

## Why Oktapux?

* 🔐 **Encrypted at rest** - Uploaded files are encrypted with AES-256-GCM.
* 🔗 **Simple sharing** - Generate a link and send it wherever you want.
* ⏳ **Automatic expiration** - Expire Crates by date or download count.
* 🔑 **Password protection** - Add an additional password to individual Crates.
* 📥 **File requests** - Create upload-only links so other people can send files to you.
* 🗄️ **SQLite** - No external database required.
* 🐳 **Docker-ready** - Deploy with Docker Compose in minutes.
* 📊 **Operational endpoints** - Health checks, metrics, structured logging, and optional Sentry support.

---

## Features

### Sharing

* Upload multiple files into a single Crate
* Generate secure Crate tokens
* Custom Crate URLs
* Password-protected Crates
* Permanent Crates
* Expiration by date
* Expiration by download count
* Download individual files
* Download an entire Crate as an archive
* QR codes for Crates

### File Collections

Need someone to send you files?

Create a **Collection** and give the generated upload link to another person.

They can upload files without gaining access to the files already stored in the Collection.

```text
You
 │
 └── Create file request
          │
          ▼
     Upload-only link
          │
          ▼
     Other person
          │
          └── Uploads files
```

This is useful for things like:

* Collecting documents
* Receiving photos
* Gathering project files
* Receiving submissions
* Asking someone to send you a large file

### Security

Crateyard is designed with self-hosted privacy and security in mind.

* AES-256-GCM encryption for files at rest
* Per-file key derivation
* Random initialization vectors
* Password-protected Crates
* Session-protected administration
* Crate/file authorization checks
* Download limits
* Rate limiting
* Input validation
* Automatic cleanup of expired content
* No third-party storage required

> **Important:** Keep your `ENCRYPTION_KEY_SECRET` safe. If it is lost, encrypted files may become unrecoverable.

---

# Quick Start

## Docker Compose

The easiest way to run Crateyard is Docker.

Create a directory for the application:

```bash
mkdir crateyard
cd crateyard
```

Create a `.env` file:

```bash
cat > .env <<EOF
ENCRYPTION_KEY_SECRET=$(openssl rand -hex 32)
NUXT_SESSION_PASSWORD=$(openssl rand -hex 32)
EOF
```

Create `docker-compose.yml`:

```yaml
services:
  app:
    image: ghcr.io/kannomer/oktapux-share:main
    container_name: oktapux-share
    ports:
      - "3003:3000"
    volumes:
      - ./uploads:/app/uploads
      - ./data:/app/data
    environment:
      NODE_ENV: production
      ENCRYPTION_KEY_SECRET: ${ENCRYPTION_KEY_SECRET}
      NUXT_SESSION_PASSWORD: ${NUXT_SESSION_PASSWORD}
    restart: unless-stopped
```

Start the application:

```bash
docker compose up -d
```

Then open:

**http://localhost:3003**

On the first visit, Crateyard will guide you through the one-time administrator setup.

### Updating

```bash
docker compose pull
docker compose up -d
```

The published Docker image supports:

* `linux/amd64`
* `linux/arm64`

So it can run on standard x86 servers as well as many ARM-based systems.

---

# Build From Source

## Requirements

* Node.js 22+
* pnpm 11+
* Git

Clone the repository:

```bash
git clone https://github.com/kannomer/oktapux-share.git
cd crateyard
```

Install dependencies:

```bash
pnpm install
```

Initialize the local environment and database:

```bash
pnpm run setup
```

Start the development server:

```bash
pnpm run dev
```

Open:

```text
http://localhost:3000
```

---

# Configuration

Crateyard can be configured through environment variables.

Create a `.env` file:

```env
# Required
# Used to encrypt uploaded files at rest.
ENCRYPTION_KEY_SECRET=

# Required
# Used to encrypt the administrator session.
NUXT_SESSION_PASSWORD=

# Optional
# Pino log level.
LOG_LEVEL=info

# Optional
# Sentry-compatible DSN for external error tracking.
SENTRY_DSN=
```

Generate secure secrets with:

```bash
openssl rand -hex 32
```

### Backups

Back up both:

```text
data/
uploads/
.env
```

In particular, **do not lose `ENCRYPTION_KEY_SECRET`**.

The encryption key is part of the data-recovery chain for encrypted files.

---

# Production

Crateyard is intended to sit behind a reverse proxy in production.

For example:

```text
Internet
   │
   ▼
Caddy / Nginx / Traefik
   │
   ▼
Crateyard
   │
   ├── SQLite
   └── Encrypted files
```

HTTPS is strongly recommended when exposing an instance to the public internet.

A reverse proxy can also provide:

* TLS certificates
* Domain names
* Access logging
* Additional rate limiting
* Network-level security controls

---

# Health & Monitoring

A health endpoint is available at:

```text
GET /api/health
```

It returns a successful response when the application and SQLite database are healthy.

This makes it suitable for:

* Docker health checks
* Uptime Kuma
* Reverse proxies
* Monitoring systems
* Server orchestration

Authenticated administrators can also access:

```text
GET /api/metrics
```

for in-process request and error metrics.

Application errors are emitted as structured JSON logs.

Set the log level with:

```env
LOG_LEVEL=info
```

Optional Sentry-compatible error tracking can be enabled with:

```env
SENTRY_DSN=...
```

---

# Development

Install dependencies and initialize the project:

```bash
pnpm install
pnpm run setup
```

Start the development server:

```bash
pnpm run dev
```

## Available scripts

| Command              | Description                               |
| -------------------- | ----------------------------------------- |
| `pnpm dev`           | Start the development server              |
| `pnpm build`         | Build the production application          |
| `pnpm start`         | Start the production server               |
| `pnpm preview`       | Preview a production build                |
| `pnpm setup`         | Initialize local environment and database |
| `pnpm lint`          | Run ESLint                                |
| `pnpm typecheck`     | Run Nuxt/TypeScript type checking         |
| `pnpm test`          | Run the test suite                        |
| `pnpm test:coverage` | Run tests with coverage                   |
| `pnpm audit --prod`  | Audit production dependencies             |

---

# Testing

Crateyard uses Vitest for automated testing.

Run the test suite:

```bash
pnpm test
```

Run coverage:

```bash
pnpm test:coverage
```

Before submitting changes, run:

```bash
pnpm lint
pnpm typecheck
pnpm run setup
pnpm test:coverage
pnpm audit --prod
pnpm build
```

The project also includes a fresh-clone verification script used to validate that the repository can be installed and built from a clean checkout.

---

# Architecture

Crateyard intentionally keeps its infrastructure small.

```text
┌─────────────────────────────┐
│          Browser            │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Nuxt 4 / Nitro        │
│                             │
│  UI · API · Authentication  │
└───────┬───────────┬─────────┘
        │           │
        ▼           ▼
┌────────────┐  ┌─────────────┐
│   SQLite   │  │   Storage   │
│  Drizzle   │  │  encrypted  │
└────────────┘  │    files    │
                └─────────────┘
```

### Why SQLite?

Crateyard is designed primarily for straightforward, single-instance self-hosting.

SQLite keeps deployment simple:

* No PostgreSQL container
* No Redis
* No external database
* Easy backups
* Minimal maintenance

The trade-off is that the application is not designed around horizontally scaled, multi-instance deployments.

For a personal server, homelab, small team, or single VPS, this keeps the architecture pleasantly simple.

---

# Security Notes

Crateyard is intended to be self-hosted software, but no software can guarantee complete security.

If you expose an instance to the public internet:

1. Use HTTPS.
2. Keep the application updated.
3. Use strong randomly generated secrets.
4. Back up your data and encryption secret.
5. Put the application behind a properly configured reverse proxy.
6. Avoid exposing the SQLite database directly.
7. Monitor disk usage.
8. Consider additional network-level rate limiting for public deployments.

Crateyard does not inspect or moderate uploaded content.

---

# Contributing

Contributions, bug reports, and feature requests are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

For changes, please include:

* A description of what changed
* Why the change is needed
* Tests covering the relevant behavior
* Any documentation updates that are necessary

Before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm audit --prod
pnpm build
```

Please do not commit:

* `.env` files
* Local databases
* Uploaded files
* Build output
* `node_modules`

---

# License

Crateyard is released under the **MIT License**.

See [LICENSE](LICENSE) for the full license text.
