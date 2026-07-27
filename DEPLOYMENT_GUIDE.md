# Deployment Guide

X Studio is a Create React App frontend plus two Netlify Functions. The
functions hold every API key, so the browser bundle never ships a secret.

## 1. Prerequisites

- Node.js 18+ (tested on Node 22)
- A Netlify account (free tier is enough)
- Optional: one free provider key — see [README](./README.md#-where-to-get-free-models)

## 2. Local development

```bash
npm install

# Full stack: React dev server + Netlify Functions on http://localhost:8888
npm run dev

# Frontend only on http://localhost:3000
# Chat still works through the built-in keyless provider.
npm start
```

Server-side keys are read from a local `.env` file (copy `.env.example`).
`.env` is git-ignored. `npm run dev` loads it automatically; `npm start` does
not run the functions at all.

## 3. Verify before shipping

```bash
npm test                  # 18 unit + app smoke tests
npm run verify:functions  # calls the real chat/models functions end to end
npm run build             # production build
```

`verify:functions` checks model discovery, request validation, rate limiting,
streaming, non-streaming, provider fallback and the legacy request shape. It
talks to a live keyless provider, so an occasional upstream rate-limit failure
is expected — re-run after a minute.

## 4. Deploy to Netlify

### Option A — Git (recommended)

1. Push the repository to GitHub.
2. Netlify → *Add new site* → *Import an existing project* → pick the repo.
3. Build settings are read from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `build`
   - Functions directory: `netlify/functions`
4. Deploy.

### Option B — CLI

```bash
npm run build
npx netlify-cli deploy --prod
```

## 5. Configure providers

Netlify → Site settings → Environment variables → add any of:

| Variable | Provider |
|---|---|
| `GROQ_API_KEY` | Groq |
| `GEMINI_API_KEY` | Google Gemini |
| `CEREBRAS_API_KEY` | Cerebras |
| `OPENROUTER_API_KEY` | OpenRouter |
| `MISTRAL_API_KEY` | Mistral |
| `GITHUB_MODELS_TOKEN` | GitHub Models |
| `NVIDIA_API_KEY` | NVIDIA NIM |
| `TOGETHER_API_KEY` | Together AI |
| `LLM7_API_KEY` | LLM7 (optional, raises the keyless limit) |

Redeploy after adding variables. New providers appear in the model picker
automatically — the list is discovered at runtime, not hardcoded.

No variables at all is a valid setup: the app falls back to the keyless
provider. Provider keys are managed only through server-side environment variables.

## 6. Post-deploy checks

```bash
# Model discovery: should list your configured providers
curl -s -X POST https://<your-site>.netlify.app/.netlify/functions/models \
  -H 'Content-Type: application/json' -d '{}' | head -c 400

# Streaming chat: should print SSE frames
curl -N -X POST https://<your-site>.netlify.app/.netlify/functions/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}],"stream":true}'
```

In the browser, confirm:

- a reply streams in word by word, and the stop button halts it
- the model picker lists your providers and switching models persists
- Arabic input answers in Arabic and code blocks stay left-to-right
- image mode returns an image and the download button works
- dark/light theme and language switches persist after a reload

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `No AI provider is configured` | no key and the keyless provider is down | add a free key (env var or Settings) |
| Replies work locally but not deployed | env variables not set, or site not redeployed | add variables, then trigger a redeploy |
| Only one provider in the picker | other keys missing or invalid | check the variable names in the table above |
| `Too many requests` | per-IP rate limit (30/min) or upstream limit | wait a moment, or add a provider key |
| Chat 404 with `npm start` | functions are not running | use `npm run dev` |
| Model list looks stale | 10-minute cache | press refresh in the model picker |

## 8. Security checklist

- [ ] No API key committed to the repository (`.env`, `api.txt`, `*.key` are ignored)
- [ ] Keys added only as Netlify environment variables
- [ ] Any key that was ever committed or shared has been rotated
- [ ] `netlify.toml` security headers present
- [ ] `npm run verify:functions` passes against production
