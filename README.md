# LinkedIn Post Generator

Self-hosted Next.js app for generating short LinkedIn posts, longer LinkedIn articles, ideas, and image concepts from saved sources and Dilip Krishna's brand memory.

## Current MVP

- Next.js App Router UI with dashboard, sources, post studio, article studio, ideas, brand memory, imports, and settings.
- Server-side generation endpoints with deterministic mock output until provider keys are configured.
- Prisma schema for users, workspaces, sources, posts, articles, viewpoints, sensitive topics, voice profiles, generated images, and encrypted provider credentials.
- Docker Compose stack for Next.js, PostgreSQL with pgvector, Redis, and Caddy.
- Admin seed script with default viewpoints, sensitive topic guidance, and voice profile.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database Setup

```bash
cp .env.example .env
docker compose up -d db redis
npx prisma migrate dev
npm run create-admin
```

## Provider Keys

For the MVP, generation works without keys by using local mock output. Add these values to `.env` when wiring live providers:

```txt
OPENAI_API_KEY=
GEMINI_API_KEY=
APP_SECRET_ENCRYPTION_KEY=
```

Generate a 32-byte base64 encryption key with:

```bash
openssl rand -base64 32
```
# linkedin-post-generator
# linkedin-post-generator
