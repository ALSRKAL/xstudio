# X Studio - AI Chat & Image Generation 🚀

A professional, provider-agnostic AI chat app: real token streaming, automatic
model discovery across many free providers, Arabic/English RTL-aware UI, and
image generation. Keys stay on the server.

## ✨ What it does

- **Real streaming** — tokens render as the model produces them (SSE), with a
  working stop button that actually aborts the request.
- **Any provider, one protocol** — every provider is called through the
  OpenAI-compatible chat API, so adding one is a few lines of config.
- **Live model discovery** — the model list is fetched from the providers you
  configured, so it never goes stale and no model id is hardcoded.
- **Never dead on arrival** — a keyless provider is built in, so the app answers
  before you configure anything.
- **Automatic fallback** — transient errors retry, then fall back to the keyless
  provider instead of failing.
- **Image generation** — keyless (Pollinations/FLUX) with automatic Arabic →
  English prompt translation and prompt enrichment.
- **Bilingual UI (ar/en)** with full RTL, light/dark themes, chat history with
  search, local storage compression, and per-device usage limits.

## 🆓 Models

The primary provider is **OpenRouter**: one free key unlocks the whole free
catalogue, and the list is discovered at runtime, so it is never stale.

Free text models available through it today (context window in tokens):

| Model | Vendor | Context |
|---|---|---|
| Nemotron 3 Ultra 550B A55B | NVIDIA | 1M |
| Nemotron 3 Super 120B A12B | NVIDIA | 262K |
| Ling 3.0 Flash | InclusionAI | 262K |
| Laguna M.1 / S 2.1 / XS 2.1 | poolside | 262K |
| Gemma 4 31B · 26B A4B (vision) | Google | 262K |
| North Mini Code | Cohere | 256K |
| Nemotron 3 Nano 30B A3B · Nano Omni (vision) | NVIDIA | 256K |
| Free Models Router | OpenRouter | 200K |
| gpt-oss-20b | OpenAI | 131K |
| Nemotron Nano 12B V2 VL (vision) · Nano 9B V2 | NVIDIA | 128K |

Image models: **Pollinations** (keyless, always on), plus **FLUX.1 schnell** via
Cloudflare Workers AI or Together AI when their keys are set.

A note on the numbers you see on OpenRouter's ranking page (2.3T, 416B, …):
those are **weekly token volumes**, not model sizes. The table above lists the
context window, which is what actually limits a conversation.

Non-chat free models (music, moderation, embeddings, rerankers, image
generators) are filtered out of the chat picker on purpose.

### Adding a key

1. **Server (recommended).** Netlify → Site settings → Environment variables →
   add the variable, then redeploy. The key never reaches the browser.
2. **In-app (per visitor).** Settings → *Free model providers* → paste a key. It
   stays in that browser and is used only for that visitor's requests.

Optional extra providers, each adding its own models to the picker: Groq,
Google Gemini, Cerebras, Mistral, GitHub Models, NVIDIA NIM, Together AI.
See [`.env.example`](./.env.example) for every variable and signup link.

> **OpenRouter gotcha.** If every model answers
> `404 No allowed providers are available for the selected model`, your account
> has a provider allow-list. Open OpenRouter → Settings and clear it, otherwise
> only that one provider's models can run.

A keyless provider (LLM7) stays wired in as an emergency fallback. It is never
listed in the picker; it answers only when the selected provider fails, and the
UI says so when that happens.

## 🚀 Quick start

```bash
npm install

# Full stack (React + Netlify Functions) - required for server-side keys
npm run dev

# Frontend only. The app still works: it falls back to the keyless provider.
npm start
```

Then open the printed URL (usually <http://localhost:8888> for `npm run dev`).

### Verify before shipping

```bash
npm test                  # unit + app smoke tests
npm run verify:functions  # hits the real backend functions end to end
npm run build             # production build
```

## 🧱 Architecture

```
netlify/
  lib/providers.mjs        Provider registry (URLs, keys, model parsing)
  functions/chat.mjs       Streaming chat proxy: validation, throttle, retry, fallback
  functions/models.mjs     Live model discovery + cache
src/
  config/api.js            Single source of truth: branding, endpoints, providers, limits
  config/prompts.js        System prompts
  services/aiClient.js     Streaming client: abort, retry, keyless fallback
  services/sseParser.js    SSE token parser (unit tested)
  hooks/useMessageSender.js  Send / regenerate / stop - one pipeline
  hooks/useModelCatalog.js   Model discovery + local cache
  hooks/useChatLogic.js      Chat persistence
  hooks/useToast.js          Non-blocking notifications
  components/               Sidebar, ChatMessage, ChatInput, ModelSelector, Settings, Toast
  utils/                    storage, compression, usage tracking, clipboard, i18n
```

**Adding a provider:** add one entry to `netlify/lib/providers.mjs` and one to
`PROVIDERS` in `src/config/api.js`, then set its env var. That is all — the
model list, picker grouping and fallback logic pick it up automatically.

## 🔒 Security notes

- API keys live in server-side environment variables; the browser bundle has none.
- The chat function validates method, JSON, roles, message count and payload size,
  and applies a per-IP rate limit.
- Keys pasted in Settings stay in that browser's `localStorage` and are used only
  for that visitor's own requests. For a shared deployment prefer env variables.
- Security headers (`nosniff`, `SAMEORIGIN`, referrer policy, permissions policy)
  are set in `netlify.toml`.

## 📄 License

MIT
