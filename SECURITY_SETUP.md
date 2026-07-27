# 🔒 الأمان / Security

> نسخة عربية أولاً، ثم English.

## كيف تُدار المفاتيح

كل مفاتيح الـ API تُقرأ داخل Netlify Functions على السيرفر فقط. حزمة المتصفح
لا تحتوي أي مفتاح، ولا يوجد أي متغير `REACT_APP_*` للمفاتيح.

المسار: المتصفح → `/.netlify/functions/chat` → المزوّد. المفتاح يُضاف في
السيرفر ولا يظهر في أدوات المطوّر أبداً.

## الخطوات المطلوبة منك

### 1) إذا سُرّب مفتاح سابقاً — أعد توليده فوراً

أي مفتاح كُتب في ملف داخل المشروع أو أُرسل في محادثة يُعتبر مكشوفاً:

1. اذهب إلى لوحة المزوّد (مثال: <https://console.groq.com/keys>).
2. احذف المفتاح القديم (Revoke) وأنشئ واحداً جديداً.
3. أضف الجديد كمتغيّر بيئة في Netlify فقط.

### 2) تأكد أن الملفات الحساسة غير متتبّعة في Git

```bash
git rm --cached .env api.txt 2>/dev/null
git check-ignore -v .env api.txt   # يجب أن يطبع أنها مُستثناة
```

الملفات المستثناة في `.gitignore`: `.env`, `api.txt`, `api*.txt`, `keys.txt`,
`secrets*`, `*.key`, `*.pem`.

### 3) أضف المفاتيح في Netlify

Netlify → Site settings → Environment variables → أضف ما تحتاجه
(`GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`, …)
ثم أعد النشر. القائمة الكاملة في [`.env.example`](./.env.example).

### 4) للتطوير المحلي

```bash
cp .env.example .env   # ثم املأ ما تريد
npm run dev
```

`.env` مستثنى من Git ولا يُرفع أبداً.

## إدارة المفاتيح في النسخة المنشورة

لا تعرض نافذة الإعدادات مفاتيح المزوّدين ولا تسمح بإدخالها. تُدار جميع المفاتيح
كمتغيرات بيئة على الخادم فقط، ولا تصل إلى حزمة المتصفح.

## الحمايات المطبّقة في الكود

| الحماية | المكان |
|---|---|
| المفاتيح على السيرفر فقط | `netlify/lib/providers.mjs` |
| رفض غير POST + JSON غير صالح | `netlify/functions/chat.mjs` |
| تحقّق من الأدوار وعدد الرسائل وحجم المحتوى | `sanitizeMessages` في `chat.mjs` |
| حد أقصى للطلبات لكل IP (30/دقيقة) | `chat.mjs` |
| مهلة زمنية للطلبات (120 ثانية) | `chat.mjs` |
| عدم تخزين ردود اكتشاف الموديلات في كاش عام | `netlify/functions/models.mjs` |
| ترويسات أمان (`nosniff`, `SAMEORIGIN`, Referrer/Permissions Policy) | `netlify.toml` |
| حد استخدام لكل جهاز | `src/utils/usageTracker.js` |

## قائمة تحقّق قبل التسليم

- [ ] لا يوجد مفتاح في أي ملف داخل المستودع
- [ ] المفاتيح القديمة المكشوفة تم إعادة توليدها
- [ ] المفاتيح مضافة في Netlify فقط
- [ ] `npm run verify:functions` ناجح
- [ ] `npm test` و `npm run build` ناجحان

---

## English summary

- All API keys are read server-side inside Netlify Functions. The browser bundle
  contains no key and no `REACT_APP_*` secret exists.
- Rotate any key that was ever written into a repository file or shared in chat.
- Sensitive files (`.env`, `api.txt`, `*.key`, `*.pem`, `secrets*`) are
  git-ignored. Verify with `git check-ignore -v <file>`.
- Add keys as server-side environment variables in the deployment dashboard, then
  redeploy. Full list in [`.env.example`](./.env.example).
- Provider keys are not displayed or editable in the public Settings dialog.
- Backend protections: method/JSON validation, role and size sanitisation, a
  per-IP rate limit, request timeouts, no public caching of key-dependent
  responses, and security headers from `netlify.toml`.
