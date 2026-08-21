<p align="center">
<img src="https://raw.githubusercontent.com/kannomer/oktapux-share/refs/heads/main/public/logo_mini.svg" width="100" height="100" border="10"/>
</p>

<div align="center">

# Oktapux Share

**Oktapux Share** is a lightweight, self-hosted file sharing platform inspired by [Pingvin Share](https://github.com/stonith404/pingvin-share).  
Upload files, generate shareable links, and control exactly how long they last.

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Drizzle_ORM-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## ✨ Features

- 📤 Upload multiple files in a single share
- 🔗 Auto-generated shareable links per upload
- ⏳ Expiration by date
- 🔢 Expiration by download count
- ♾️ Permanent share option
- 🪶 Lightweight: single SQLite database, zero external services required
- 🔐 Files encrypted at rest (AES-256-GCM)
- 🔑 Optional password protection per share
- 🛠️ Admin-configurable instance settings (max file size, allowed share types, expiry caps)
- 🐳 Docker support for easy self-hosting

---

## ⚙️ Setup

### Requirements

- Node.js 18+
- pnpm
- Docker _(optional, for self-hosting)_

### Development

```bash
# 1. Clone the repo
git clone https://github.com/kannomer/oktapux-share.git
cd oktapux-share

# 2. Install dependencies
pnpm install

# 3. Bootstrap the local environment and database
pnpm run setup

# 4. Start the dev server
pnpm run dev
```

App runs at `http://localhost:3000`. On first visit, you'll be redirected to a one-time setup wizard to create the admin account before the rest of the site becomes accessible.

### Verification

Run the same checks used by CI locally:

```bash
pnpm lint
pnpm nuxi typecheck
pnpm test
pnpm audit --prod
```

### Operations

The service exposes `GET /api/health` for Docker, reverse proxies, and uptime checks. It returns `{ "status": "ok" }` when the SQLite database is reachable and responds with HTTP 503 when the database check fails.

Application errors are emitted as structured JSON logs. Set `LOG_LEVEL` (for example, `warn` or `debug`) to control log verbosity.

### Production (Docker)

The easiest way to self-host Oktapux Share is with Docker Compose.

**1. Pull and run with Docker Compose**

Create a `docker-compose.yml` file on your server:

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
      - NODE_ENV=production
      - ENCRYPTION_KEY_SECRET=${ENCRYPTION_KEY_SECRET}
      - NUXT_SESSION_PASSWORD=${NUXT_SESSION_PASSWORD}
    restart: unless-stopped
```

Then create a `.env` file next to it with generated secrets, and start the app:

```bash
echo "ENCRYPTION_KEY_SECRET=$(openssl rand -hex 32)" > .env
echo "NUXT_SESSION_PASSWORD=$(openssl rand -hex 32)" >> .env
docker compose up -d
```

> ⚠️ Back up your `.env` along with `data/`. If `ENCRYPTION_KEY_SECRET` is ever lost, passwordless shares become unrecoverable.

App runs at `http://localhost:3003`. Database migrations run automatically on startup. On first visit, you'll be redirected to a one-time setup wizard to create the admin account.

**2. Updating to a newer version**

```bash
docker compose pull
docker compose up -d
```

**3. Build from source**

If you prefer to build the image yourself:

```bash
git clone https://github.com/kannomer/oktapux-share.git
cd oktapux-share
docker compose up -d --build
```

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome. Feel free to open an issue or submit a pull request.

---

## ⚠️ Disclaimer

This is a file-sharing platform. Users are fully responsible for any files they upload, share, or distribute through instances of this software. The maintainers do not monitor, control, or endorse user-generated content and assume no responsibility for any content transmitted via deployments of this software.
