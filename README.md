# Thanzi AI Proxy

Secure API gateway / reverse proxy for AI providers, built on **Cloudflare Workers**.  
Powers the [Thanzi](https://github.com/edisontaimu9-ui/thanzi) nutrition & health PWA.

## Supported providers

| Provider | Status | Path prefix |
|---|---|---|
| Groq | ✅ Active | `/v1/groq/...` |
| OpenAI | 🔜 Planned | `/v1/openai/...` |
| Anthropic | 🔜 Planned | `/v1/anthropic/...` |

---

## Setup

### 1. Install Wrangler

```bash
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 3. Create the KV namespace

```bash
npm run kv:create
# For local dev preview namespace:
npm run kv:create:preview
```

Paste the generated IDs into `wrangler.toml` under `[[kv_namespaces]]`.

### 4. Add provider secrets

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put OPENAI_API_KEY      # when ready
npx wrangler secret put ANTHROPIC_API_KEY   # when ready
```

### 5. Add your first client API key

```bash
npm run keys:add thanzi_YOUR_KEY app-thanzi "Thanzi PWA"
# Then run the printed wrangler command
```

Keys must start with `thanzi_`. Generate a random one with:
```bash
node -e "console.log('thanzi_' + crypto.randomUUID().replace(/-/g,''))"
```

### 6. Deploy

```bash
npm run deploy
```

---

## Local development

```bash
npm run dev
```

`BYPASS_AUTH=true` is set automatically for the `dev` environment — no key needed locally.

```bash
# Test locally
curl http://localhost:8787/health

curl -X POST http://localhost:8787/v1/groq/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3-8b-8192","messages":[{"role":"user","content":"Hello"}]}'
```

---

## API reference

### Authentication

Every request (except `/health`) requires a client key:

```
X-Thanzi-Key: thanzi_YOUR_KEY
# or
Authorization: Bearer thanzi_YOUR_KEY
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (no auth) |
| `POST` | `/v1/groq/v1/chat/completions` | Groq chat completions |
| `GET` | `/v1/groq/v1/models` | List Groq models |
| `POST` | `/v1/openai/v1/chat/completions` | OpenAI chat (planned) |
| `POST` | `/v1/anthropic/v1/messages` | Anthropic messages (planned) |

### Rate limits

Default: **60 requests / 60 seconds** per client key.  
Per-key overrides can be set in the KV record: `{ ..., "rateLimit": { "requests": 200, "windowSec": 60 } }`

---

## GitHub Actions (CI/CD)

Add these secrets to your GitHub repository:

| Secret | Where to find it |
|---|---|
| `CF_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token (Workers Edit template) |
| `CF_ACCOUNT_ID` | Cloudflare Dashboard → right sidebar on any Workers page |

Every push to `main` auto-deploys.

---

## Project structure

```
thanzi-ai-proxy/
├── src/
│   ├── index.js              # Worker entry & routing
│   ├── utils.js              # CORS, error helpers
│   ├── providers/
│   │   ├── groq.js           # Groq (active)
│   │   ├── openai.js         # OpenAI (stub)
│   │   └── anthropic.js      # Anthropic (stub)
│   └── middleware/
│       ├── auth.js           # X-Thanzi-Key validation
│       └── rateLimit.js      # KV sliding-window rate limiter
├── scripts/
│   └── add-key.mjs           # Helper to generate KV put commands
├── .github/workflows/
│   └── deploy.yml            # Auto-deploy on push to main
├── wrangler.toml
└── package.json
```
