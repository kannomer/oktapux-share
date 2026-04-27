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
- 🐳 Docker support for easy self-hosting

---

## 🛠️ Tech Stack

| Layer        | Technology                        |
| ------------ | --------------------------------- |
| Frontend     | Nuxt 4, Nuxt UI                   |
| Backend      | Node.js via Nuxt H3 server routes |
| Database     | SQLite + Drizzle ORM              |
| File Storage | Local filesystem                  |
| Deployment   | Docker + Docker Compose           |

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

# 3. Run database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 4. Start the dev server
pnpm run dev
```

App runs at `http://localhost:3000`.

### Production (Docker)

The easiest way to self-host Oktapux Share is with Docker Compose.

**1. Pull and run with Docker Compose**

Create a `docker-compose.yml` file on your server:

```yaml
services:
  app:
    image: ghcr.io/kannomer/oktapux-share:latest
    container_name: oktapux-share
    ports:
      - "3003:3000"
    volumes:
      - ./uploads:/app/uploads
      - ./oktapux.db:/app/oktapux.db
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Then run:

```bash
docker compose up -d
```

App runs at `http://localhost:3003`. Database migrations run automatically on startup.

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

## 🗺️ Roadmap

- [x] File upload with shareable links
- [x] Expiration by date
- [x] Expiration by download count
- [x] Permanent share option
- [x] Share page UI (download page for recipients)
- [x] Download entire share as zip
- [x] Copy link
- [x] Docker support
- [x] Auto-publish Docker image via GitHub Actions
- [ ] QR code
- [ ] Cleanup job for expired shares & files

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome. Feel free to open an issue or submit a pull request.

---

## ⚠️ Disclaimer

This is a file-sharing platform. Users are fully responsible for any files they upload, share, or distribute through instances of this software. The maintainers do not monitor, control, or endorse user-generated content and assume no responsibility for any content transmitted via deployments of this software.
