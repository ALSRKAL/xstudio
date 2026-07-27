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

## 🆓 Where to get free models

You need **zero keys to start**. Adding one free key gives you much stronger and
faster models. Nothing here requires a credit card.

| Provider | Free tier | Get a key | Env variable |
|---|---|---|---|
| LLM7 | Built in, works with no key | <https://llm7.io> | `LLM7_API_KEY` (optional) |
| Groq | Fastest inference, generous limits | <https://console.groq.com/keys> | `GROQ_API_KEY` |
| Google Gemini | Generous AI Studio free tier | <https://aistudio.google.com/apikey> | `GEMINI_API_KEY` |
| Cerebras | Very fast, free tier | <https://cloud.cerebras.ai> | `CEREBRAS_API_KEY` |
| OpenRouter | Many `:free` models, one key | <https://openrouter.ai/keys> | `OPENROUTER_API_KEY` |
| Mistral | Free experiment tier | <https://console.mistral.ai/api-keys> | `MISTRAL_API_KEY` |
| GitHub Models | Free with a GitHub token | <https://github.com/settings/tokens> | `GITHUB_MODELS_TOKEN` |
| NVIDIA NIM | Free developer credits | <https://build.nvidia.com> | `NVIDIA_API_KEY` |
| Together AI | Selected free models | <https://api.together.xyz/settings/api-keys> | `TOGETHER_API_KEY` |

Two ways to use a key:

1. **Server (recommended for a public site).** Add the variable in
   Netlify → Site settings → Environment variables, then redeploy. The key never
   reaches the browser and every visitor benefits.
2. **In-app (per visitor).** Settings → *Free model providers* → paste a key.
   It is stored in that browser only and forwarded per request.

Newly enabled providers show up in the model picker automatically — no code
change, no new deploy beyond the env var.

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
