# LinkedIn Post & Article Generator App — Codex Build Spec

## 1. Project Overview

Build a self-hosted web application that helps Dilip Krishna generate short, punchy LinkedIn posts and longer-form LinkedIn articles from multiple source types:

1. Public Deloitte URLs
2. Other public article URLs
3. YouTube/video links and transcripts
4. Pasted text
5. Uploaded PDFs, DOCX files, EPUBs, and other documents
6. Book notes or long-form source material
7. Original ideas generated from Dilip’s saved viewpoints, past posts, and research database

The app should learn from Dilip’s prior LinkedIn shares and articles, preserve his voice, store all source material and drafts, support semantic search/RAG, and guide him through creating posts with different angles.

The app will be hosted on a Hostinger VPS using Docker Compose.

---

## 2. Primary Goals

### Core goals

- Generate high-quality LinkedIn posts that are:
  - short
  - punchy
  - easy to read
  - pithy
  - insightful
  - lightly emoji-enhanced
  - reflective of Dilip’s point of view

- Generate longer-form LinkedIn articles as a separate workflow.

- Use Dilip’s historical LinkedIn shares and articles as source material for:
  - voice modeling
  - recurring themes
  - preferred structure
  - tone
  - common hooks
  - strategic viewpoints

- Store all sources, drafts, final posts, edits, and metadata in a durable database.

- Support semantic search across prior posts, articles, source materials, and generated drafts.

- Support multiple LLM providers:
  - OpenAI
  - Google Gemini
  - Anthropic, optional future provider
  - local open-weight models in the future

- Include image generation support using provider APIs such as OpenAI and Gemini.

---

## 3. Recommended Stack

Use the following stack unless there is a strong reason to change it.

### Frontend and backend

**Next.js full-stack app using the App Router**

Reasons:
- Good for a single-user productivity app.
- Easy to deploy with Docker.
- Can handle frontend UI, API routes, background jobs, auth, and file uploads.
- Codex can work efficiently in a single TypeScript codebase.

### Language

**TypeScript**

### Database

**PostgreSQL with pgvector**

Reasons:
- Scales reasonably.
- Works well with Docker Compose.
- Supports relational data and vector search in one place.
- pgvector is not too complex if using the official `pgvector/pgvector` Docker image.

### ORM

**Prisma**

Reasons:
- Easy schema management.
- Strong TypeScript support.
- Simple migrations.

### Background jobs

Use **BullMQ + Redis**.

Reasons:
- Needed for long-running tasks:
  - URL ingestion
  - document parsing
  - embedding generation
  - long book/article summarization
  - image generation
  - batch imports

### File storage

Use local mounted Docker volume for MVP.

Recommended path inside container:

```txt
/app/storage/uploads
```

Later, allow S3-compatible storage.

### Auth

Use **Auth.js / NextAuth** with credentials login for MVP.

- Single-user initially.
- Database schema should allow multi-user support later.
- Include `User`, `Organization`, or `Workspace` concepts even if only one user exists at first.

### Reverse proxy

Use **Caddy** in Docker Compose.

Reasons:
- Easier than Nginx for automatic HTTPS.
- Good VPS deployment experience.
- Minimal config.

---

## 4. High-Level Architecture

```txt
Browser
  |
  v
Next.js App
  |-- UI pages
  |-- API routes
  |-- Server actions
  |
  |-- Prisma ORM
  |-- LLM provider abstraction
  |-- ingestion services
  |-- RAG/retrieval services
  |-- prompt orchestration
  |
  v
PostgreSQL + pgvector

Redis + BullMQ
  |
  v
Background workers
  |-- URL fetch/parsing
  |-- PDF/DOCX/EPUB parsing
  |-- CSV/HTML import
  |-- embeddings
  |-- summarization
  |-- draft generation
  |-- image generation

Local file volume
  |-- uploaded files
  |-- parsed raw artifacts
  |-- generated images
```

---

## 5. Main User Workflows

## 5.1 Import Past LinkedIn Activity

Dilip will provide:

1. CSV file for LinkedIn shares/posts
2. HTML files for LinkedIn articles

The app should provide an import screen with two upload fields:

- Upload LinkedIn shares CSV
- Upload LinkedIn articles HTML files

### Import behavior

For each imported share/post:

- Parse post text
- Parse post date if available
- Parse URL if shared
- Parse engagement metrics if available
- Store original row JSON for traceability
- Generate embedding
- Add to voice/style analysis corpus

For each imported article:

- Extract title
- Extract article body
- Extract publication date if available
- Extract links if available
- Store original HTML
- Store cleaned markdown/text
- Generate embedding
- Add to voice/style analysis corpus

### Important

The import process should not overwrite existing records unless the user explicitly chooses to re-import.

Use a deduplication strategy based on:

```txt
source_type + normalized_url + content_hash
```

---

## 5.2 Add Source Material

The app should support a source inbox where Dilip can add new source material.

Source input types:

1. Public URL
2. Deloitte public URL
3. YouTube/video URL
4. Pasted text
5. PDF upload
6. DOCX upload
7. EPUB upload
8. Book notes
9. Manual idea

Each source should be stored as a `Source` record.

### Source states

```txt
queued
fetching
parsed
summarized
embedded
failed
archived
```

### Source metadata

Each source should store:

- title
- URL
- source type
- author/publication if available
- date published if available
- date added
- raw content
- cleaned content
- summary
- key points
- extracted quotes
- relevance notes
- tags
- embedding
- processing status
- error message if failed

---

## 5.3 Guided LinkedIn Post Workflow

Create a guided post creation flow.

### Step 1: Choose input mode

Options:

- Create from saved source
- Create from new URL
- Create from uploaded document
- Create from pasted text
- Create from book notes
- Create original post idea
- Remix past post/article

### Step 2: Choose post type / angle

Include these options:

1. Contrarian take
2. Executive summary
3. Personal reflection
4. Deloitte-style insight
5. Question-led post
6. Practical lesson
7. Framework post
8. Trend observation
9. “What this means for leaders”
10. Carousel outline
11. Story-driven post

### Step 3: Choose Dilip viewpoint to emphasize

Default saved viewpoints:

1. AI transformation requires operating model change.
2. The commercial model is often more critical for success than AI engineering.
3. Entrepreneurial thinking will become more valued in the future.

The app should allow Dilip to add, edit, archive, or prioritize viewpoints.

### Step 4: Choose sensitivity/nuance settings

Default nuanced topic:

- AI-created job loss

For this topic, the app should avoid simplistic claims such as:
- “AI will replace everyone”
- “AI will create only opportunity”
- “job loss is not a real concern”
- “companies should automate without regard for workers”

Instead, posts should acknowledge:
- displacement risk
- role redesign
- reskilling
- productivity gains
- organizational responsibility
- uneven impact across sectors and roles

The app should include a “Sensitive Topics” settings page where Dilip can add more nuanced topics.

Each sensitive topic should support:
- topic name
- framing guidance
- phrases to avoid
- required caveats
- preferred language
- examples

### Step 5: Generate options

Generate 3–5 draft options.

Each option should include:

- post body
- hook/title
- suggested hashtags
- suggested first comment
- suggested image idea
- recommended angle
- source citations/internal references
- confidence score
- tone/style notes

### Step 6: Edit and refine

The draft editor should allow actions:

- Make punchier
- Make more executive
- Make more personal
- Make more contrarian
- Add more nuance
- Reduce jargon
- Add emojis
- Remove emojis
- Shorten
- Expand
- Add sharper hook
- Generate more versions
- Convert to carousel outline
- Convert to long-form article outline

### Step 7: Save and status tracking

Draft states:

```txt
idea
researching
draft
edited
ready_to_post
published
archived
```

The app should store every generated version and every user edit.

---

## 5.4 Long-Form Article Workflow

This should be separate from short LinkedIn post generation.

Article workflow:

1. Choose topic or source
2. Choose thesis/viewpoint
3. Gather supporting sources from database
4. Generate outline
5. Generate section-by-section draft
6. Edit each section
7. Generate title options
8. Generate LinkedIn intro post to promote the article
9. Save final version

Article outputs:

- title options
- subtitle
- outline
- full draft
- section summaries
- pull quotes
- suggested cover image concept
- promotional LinkedIn post
- first comment
- hashtags

---

## 5.5 Original Idea Generator

Create an “Ideas” page that generates original post ideas based on:

- Dilip’s saved viewpoints
- prior LinkedIn posts
- imported articles
- saved sources
- current themes in the source database
- underused topics in Dilip’s corpus

Idea categories:

- AI transformation
- business model innovation
- operating model change
- consulting insights
- entrepreneurship
- leadership
- technology adoption
- commercialization of AI
- future of work

For each idea, provide:

- idea title
- short premise
- why it matters
- possible hook
- sources to research
- suggested angle
- related past posts/articles
- recommended viewpoint
- suggested CTA/question

Also include a “Research this idea” button that finds related sources in the local database and suggests external research queries.

---

## 6. Brand Memory and Style System

Create a dedicated “Brand Memory” page.

Sections:

### 6.1 Voice Profile

Automatically generated from past posts/articles, but editable.

Fields:

- tone summary
- writing style
- common structures
- common hooks
- preferred sentence length
- typical post length
- emoji frequency
- hashtag style
- CTA style
- topics frequently discussed
- phrases often used
- phrases to avoid
- examples of strong posts
- examples of weak posts

### 6.2 Viewpoints

Default viewpoints:

```txt
AI transformation requires operating model change.
The commercial model is often more critical for success than AI engineering.
Entrepreneurial thinking will become more valued in the future.
```

Fields:

- title
- detailed explanation
- preferred framing
- supporting arguments
- counterarguments to acknowledge
- related topics
- priority
- active/inactive

### 6.3 Sensitive Topics

Default sensitive topic:

```txt
AI-created job loss
```

Fields:

- topic
- why it needs nuance
- required caveats
- phrases to avoid
- preferred framing
- examples

### 6.4 Emoji Preferences

Fields:

- emoji usage level:
  - none
  - light
  - moderate
- preferred emojis
- banned emojis
- max emojis per post

Default:

```txt
emoji_usage_level = light
max_emojis_per_post = 3
```

### 6.5 Post Structure Preferences

Fields:

- preferred hook style
- preferred paragraph length
- preferred use of bullets
- preferred CTA style
- max post length
- default hashtag count
- preferred reading level
- banned clichés

---

## 7. AI and RAG Design

## 7.1 Provider Abstraction

Create a provider abstraction so the app can support multiple LLMs.

Example interface:

```ts
interface LLMProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructured<T>(input: GenerateStructuredInput): Promise<T>;
  generateEmbedding(input: EmbeddingInput): Promise<number[]>;
  generateImage?(input: ImageGenerationInput): Promise<ImageGenerationResult>;
}
```

Supported initial providers:

- OpenAI
- Gemini

Future providers:

- Anthropic
- Ollama/local models
- OpenRouter or LiteLLM-compatible gateway

## 7.2 API Key Security

Do not store API keys in frontend-accessible code.

API keys should be stored in one of two ways:

### MVP option

Environment variables in Docker Compose:

```txt
OPENAI_API_KEY=
GEMINI_API_KEY=
```

### Better option

Encrypted database storage for provider keys.

Use:

- server-side encryption only
- encryption key stored in environment variable
- never return full API keys to frontend
- show only masked versions in UI

Recommended implementation:

```txt
APP_SECRET_ENCRYPTION_KEY=<32-byte-base64-key>
```

Use Node crypto AES-256-GCM for encrypted provider keys.

## 7.3 Embeddings

Use embeddings for:

- past posts
- LinkedIn articles
- source content
- drafts
- final posts
- viewpoints
- sensitive topics

Store embeddings in pgvector.

Recommended initial embedding provider:

- OpenAI `text-embedding-3-small`

Allow provider to be configurable later.

## 7.4 Retrieval Strategy

When generating a post, retrieve:

1. Relevant source chunks
2. Related past posts
3. Related LinkedIn articles
4. Relevant viewpoints
5. Relevant sensitive topics
6. Voice profile examples
7. Similar successful drafts/final posts

Retrieval should be filtered by workspace/user.

Use hybrid search if feasible:

- vector similarity
- keyword search
- recency boost
- manual pinned context

MVP can start with vector similarity only.

---

## 8. Prompting System

Use structured prompt templates stored in the codebase or database.

### 8.1 System Prompt for Post Generation

The app should construct a prompt with:

- user’s voice profile
- selected source content
- selected angle
- selected viewpoint
- sensitive topic guidance
- examples of past posts
- output schema

The model must be instructed to:

- produce short, punchy LinkedIn posts
- preserve nuance
- avoid overclaiming
- use light emojis
- avoid corporate jargon
- include a clear takeaway
- include 3–5 hashtags
- include a first comment suggestion
- include an image idea

### 8.2 Output Schema

Use JSON schema for generation.

Example:

```json
{
  "drafts": [
    {
      "hook": "string",
      "post_body": "string",
      "hashtags": ["string"],
      "first_comment": "string",
      "image_idea": "string",
      "angle": "string",
      "viewpoint_used": "string",
      "sensitive_topic_notes": "string",
      "source_references": ["string"],
      "tone_notes": "string"
    }
  ]
}
```

### 8.3 Refinement Prompt

Inputs:

- current draft
- selected refinement action
- voice profile
- constraints
- sensitive topics

Output:

- revised draft
- explanation of changes
- updated hashtags
- updated first comment
- updated image idea

---

## 9. Image Generation Feature

Add an image generation panel attached to each draft.

Inputs:

- draft/post text
- selected image idea
- preferred style
- aspect ratio
- provider
- optional manual prompt

Supported image types:

- abstract business visual
- simple conceptual illustration
- LinkedIn banner-style image
- quote card
- carousel cover slide
- diagram/framework visual

Default guidance:

- professional
- clean
- not cheesy
- minimal text in image
- suitable for LinkedIn
- no fake logos
- no unauthorized Deloitte branding
- no claims of official Deloitte publication unless explicitly sourced

Store generated images with:

- prompt
- provider
- model
- image path
- associated draft/post
- generation date

---

## 10. Database Model

Use Prisma models similar to the following.

### User

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  passwordHash String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  workspaces WorkspaceMember[]
}
```

### Workspace

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members WorkspaceMember[]
  sources Source[]
  posts Post[]
  articles Article[]
  viewpoints Viewpoint[]
  sensitiveTopics SensitiveTopic[]
  voiceProfiles VoiceProfile[]
}
```

### WorkspaceMember

```prisma
model WorkspaceMember {
  id          String @id @default(cuid())
  userId      String
  workspaceId String
  role        String @default("owner")

  user      User      @relation(fields: [userId], references: [id])
  workspace Workspace @relation(fields: [workspaceId], references: [id])
}
```

### Source

```prisma
model Source {
  id          String   @id @default(cuid())
  workspaceId String
  type        String
  title       String?
  url         String?
  author      String?
  publication String?
  publishedAt DateTime?
  rawContent  String?
  cleanContent String?
  summary     String?
  keyPoints   Json?
  quotes      Json?
  tags        String[]
  status      String   @default("queued")
  error       String?
  contentHash String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  chunks SourceChunk[]
}
```

### SourceChunk

```prisma
model SourceChunk {
  id        String @id @default(cuid())
  sourceId  String
  content   String
  chunkIndex Int
  tokenCount Int?
  embedding Unsupported("vector")?

  source Source @relation(fields: [sourceId], references: [id])
}
```

### Post

```prisma
model Post {
  id          String   @id @default(cuid())
  workspaceId String
  status      String   @default("idea")
  title       String?
  body        String
  hook        String?
  hashtags    String[]
  firstComment String?
  imageIdea   String?
  angle       String?
  sourceRefs  Json?
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  versions PostVersion[]
}
```

### PostVersion

```prisma
model PostVersion {
  id        String   @id @default(cuid())
  postId    String
  body      String
  metadata  Json?
  createdAt DateTime @default(now())

  post Post @relation(fields: [postId], references: [id])
}
```

### Article

```prisma
model Article {
  id          String   @id @default(cuid())
  workspaceId String
  status      String   @default("idea")
  title       String?
  subtitle    String?
  outline     Json?
  body        String?
  sourceRefs  Json?
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id])
}
```

### Viewpoint

```prisma
model Viewpoint {
  id          String @id @default(cuid())
  workspaceId String
  title       String
  description String
  framing     String?
  supportingArguments Json?
  counterArguments Json?
  priority    Int @default(0)
  active      Boolean @default(true)
  embedding   Unsupported("vector")?

  workspace Workspace @relation(fields: [workspaceId], references: [id])
}
```

### SensitiveTopic

```prisma
model SensitiveTopic {
  id          String @id @default(cuid())
  workspaceId String
  topic       String
  guidance    String
  phrasesToAvoid String[]
  requiredCaveats Json?
  preferredLanguage Json?
  active      Boolean @default(true)
  embedding   Unsupported("vector")?

  workspace Workspace @relation(fields: [workspaceId], references: [id])
}
```

### VoiceProfile

```prisma
model VoiceProfile {
  id          String @id @default(cuid())
  workspaceId String
  name        String
  summary     String
  styleRules  Json
  examples    Json?
  active      Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id])
}
```

### GeneratedImage

```prisma
model GeneratedImage {
  id        String   @id @default(cuid())
  workspaceId String
  postId    String?
  articleId String?
  provider  String
  model     String?
  prompt    String
  imagePath String
  createdAt DateTime @default(now())
}
```

### ProviderCredential

```prisma
model ProviderCredential {
  id          String @id @default(cuid())
  workspaceId String
  provider    String
  encryptedApiKey String
  keyPreview  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 11. Pages and UI

### 11.1 Dashboard

Show:

- recent drafts
- ready-to-post items
- source processing status
- idea suggestions
- quick actions

Quick actions:

- New post
- New article
- Add source
- Generate ideas
- Import LinkedIn history

### 11.2 Sources Page

Features:

- add source
- upload file
- paste text
- URL input
- source list
- filters by type/status/tag
- source detail page
- reprocess source
- summarize source
- generate post from source

### 11.3 Post Studio

Guided workflow for LinkedIn posts.

Must include:

- source selector
- angle selector
- viewpoint selector
- sensitivity selector
- generation settings
- draft cards
- editor
- refinement actions
- save status
- image generation panel

### 11.4 Article Studio

Separate long-form workflow.

### 11.5 Ideas Page

Generate and save original ideas.

### 11.6 Brand Memory Page

Manage:

- voice profile
- viewpoints
- sensitive topics
- emoji preferences
- structure preferences
- banned phrases
- model preferences

### 11.7 Imports Page

Upload:

- LinkedIn shares CSV
- LinkedIn articles HTML

Show import preview and import results.

### 11.8 Settings Page

Manage:

- user profile
- workspace
- API keys
- provider/model preferences
- deployment diagnostics
- backup/export

---

## 12. Docker Compose Deployment

Create a Docker Compose setup with:

- app
- postgres with pgvector
- redis
- caddy

Example services:

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      - db
      - redis
    volumes:
      - ./storage:/app/storage
    networks:
      - appnet

  db:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_DB: linkedin_generator
      POSTGRES_USER: linkedin_app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - appnet

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - appnet

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    networks:
      - appnet

volumes:
  postgres_data:
  redis_data:
  caddy_data:
  caddy_config:

networks:
  appnet:
```

Example Caddyfile:

```txt
your-domain.com {
  reverse_proxy app:3000
}
```

---

## 13. Environment Variables

Create `.env.example`:

```txt
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=replace_me

DATABASE_URL=postgresql://linkedin_app:${POSTGRES_PASSWORD}@db:5432/linkedin_generator
POSTGRES_PASSWORD=replace_me

REDIS_URL=redis://redis:6379

APP_SECRET_ENCRYPTION_KEY=replace_with_32_byte_base64_key

OPENAI_API_KEY=
GEMINI_API_KEY=

DEFAULT_TEXT_PROVIDER=openai
DEFAULT_TEXT_MODEL=
DEFAULT_EMBEDDING_PROVIDER=openai
DEFAULT_EMBEDDING_MODEL=text-embedding-3-small
DEFAULT_IMAGE_PROVIDER=openai
DEFAULT_IMAGE_MODEL=
```

---

## 14. Hostinger VPS Deployment Instructions

Codex should generate a `DEPLOYMENT.md` file with steps similar to:

1. SSH into VPS.
2. Install Docker and Docker Compose plugin.
3. Point domain DNS A record to VPS IP.
4. Clone repo.
5. Copy `.env.example` to `.env`.
6. Fill in secrets.
7. Start app:

```bash
docker compose up -d --build
```

8. Run migrations:

```bash
docker compose exec app npx prisma migrate deploy
```

9. Create first admin user:

```bash
docker compose exec app npm run create-admin
```

10. Visit app domain.

---

## 15. Security Requirements

- Never expose API keys to frontend.
- Use encrypted provider credential storage if API keys are stored in the database.
- Use server-side routes for all LLM calls.
- Require authentication for all app pages.
- Add CSRF protection where relevant.
- Limit upload file size.
- Validate file types.
- Sanitize HTML imports.
- Store raw source content but render sanitized output.
- Add rate limiting for generation endpoints.
- Do not use Deloitte logos, trademarks, or branding in generated images unless explicitly provided and permitted.
- Do not represent generated content as official Deloitte content unless it is directly based on public Deloitte source material and clearly framed as commentary.

---

## 16. Content Quality Rules

Generated posts should:

- be concise
- use short paragraphs
- use clean spacing
- avoid walls of text
- include one clear insight
- avoid hype
- avoid generic AI platitudes
- use light emojis only
- include a thoughtful closing line or question
- include 3–5 relevant hashtags
- reflect Dilip’s viewpoints when selected
- preserve nuance on sensitive topics

Avoid:

- “AI is changing everything” without specificity
- “The future is now”
- “Disruption is inevitable”
- overuse of rocket/fire emojis
- shallow listicles
- generic executive-speak
- overly long hashtags
- claiming certainty about labor market outcomes

---

## 17. MVP Scope

Build MVP in this order.

### Milestone 1: Foundation

- Next.js app
- authentication
- PostgreSQL + Prisma
- Docker Compose
- Caddy deployment
- basic dashboard
- workspace model
- settings page

### Milestone 2: Imports and Sources

- CSV import for LinkedIn shares
- HTML import for LinkedIn articles
- source creation
- URL ingestion
- pasted text ingestion
- file upload storage
- basic source parsing
- source list/detail pages

### Milestone 3: Embeddings and Search

- pgvector setup
- chunking
- embedding generation
- semantic search
- related content retrieval

### Milestone 4: Brand Memory

- voice profile generation from imported posts/articles
- editable viewpoints
- editable sensitive topics
- emoji preferences
- style preferences

### Milestone 5: Post Studio

- guided workflow
- generation of 3–5 drafts
- draft editor
- refinement actions
- save versions
- status tracking

### Milestone 6: Article Studio

- long-form article outline
- article draft generation
- section editing
- promotional post generation

### Milestone 7: Image Generation

- image idea generation
- provider-backed image generation
- image storage
- image preview/download

### Milestone 8: Polish

- backup/export
- import deduplication
- better error handling
- admin diagnostics
- model/provider settings
- multi-user readiness

---

## 18. Suggested Folder Structure

```txt
src/
  app/
    dashboard/
    sources/
    post-studio/
    article-studio/
    ideas/
    brand-memory/
    imports/
    settings/
    api/
  components/
  lib/
    auth/
    db/
    llm/
    rag/
    ingestion/
    parsing/
    prompts/
    storage/
    security/
    jobs/
  workers/
  prisma/
    schema.prisma
  scripts/
    create-admin.ts
```

---

## 19. External Libraries to Consider

- `next`
- `react`
- `typescript`
- `prisma`
- `@prisma/client`
- `next-auth`
- `bullmq`
- `ioredis`
- `zod`
- `cheerio`
- `turndown`
- `papaparse`
- `pdf-parse`
- `mammoth`
- EPUB parser package
- `openai`
- `@google/generative-ai`
- `sanitize-html`
- `bcrypt`
- `react-hook-form`
- `lucide-react`
- `tailwindcss`
- `shadcn/ui`

---

## 20. Acceptance Criteria

The app is acceptable when Dilip can:

1. Log in securely.
2. Import LinkedIn shares from CSV.
3. Import LinkedIn articles from HTML.
4. Add a public URL as source material.
5. Upload or paste source material.
6. Generate embeddings for imported and new content.
7. Search semantically across prior content.
8. Edit his brand memory, viewpoints, and sensitive topics.
9. Generate 3–5 short LinkedIn post drafts from a source or idea.
10. Refine drafts using one-click actions.
11. Save drafts and move them through statuses.
12. Generate hashtags, hooks, image ideas, and first-comment text.
13. Generate a longer-form LinkedIn article separately.
14. Generate image prompts and images using configured provider keys.
15. Run the app on Hostinger VPS with Docker Compose.
16. Keep API keys secure.
17. Export or back up data.

---

## 21. Initial Seed Data

On first workspace creation, seed these viewpoints:

```txt
AI transformation requires operating model change.
The commercial model is often more critical for success than AI engineering.
Entrepreneurial thinking will become more valued in the future.
```

Seed this sensitive topic:

```txt
Topic: AI-created job loss

Guidance:
Be nuanced. Acknowledge displacement risk and uneven impact, while also discussing productivity, role redesign, reskilling, and organizational responsibility. Avoid simplistic claims that AI will either destroy all jobs or create only upside.
```

Seed emoji preferences:

```txt
Usage level: light
Max emojis per post: 3
Preferred emojis: 💡, 🔍, 🚀, ⚖️, 🧠
Banned emojis: none initially
```

---

## 22. Codex Implementation Notes

Codex should:

- Start with a working Dockerized Next.js app.
- Implement the database schema early.
- Keep LLM provider logic isolated.
- Use Zod schemas for all AI outputs.
- Make ingestion and generation jobs resumable.
- Store raw content and cleaned content separately.
- Store every generated draft version.
- Use server-only modules for API keys and provider calls.
- Avoid frontend exposure of secrets.
- Keep prompts in versioned files or database tables.
- Add tests for parsers, prompt builders, and provider abstraction.
- Add sample import files for development.
- Include clear README and DEPLOYMENT docs.

---

## 23. Non-Goals for MVP

Do not build these in MVP unless specifically requested later:

- Auto-posting directly to LinkedIn
- Browser extension
- Mobile app
- Team collaboration UI
- Full analytics dashboard
- Paid subscription system
- Complex approval workflow for teams
- Official Deloitte brand asset integration

---

## 24. Future Enhancements

- Auto-posting through LinkedIn API if approved and compliant.
- Analytics import from LinkedIn.
- Carousel slide generation.
- Browser extension for saving articles.
- Chrome share sheet.
- Local model support through Ollama.
- LiteLLM gateway support.
- Multi-user teams.
- Editorial calendar.
- Weekly idea digest.
- Trend monitoring.
- RAG evaluation dashboard.
- “Why this draft sounds like me” explainer.
- Voice profile comparison across time.
