# OpenRouter Media Studio

تطبيق ويب عربي RTL لـ studio توليد الصور والفيديو من برومبت — مدعوم عبر OpenRouter API.

## المميزات

- ✅ توليد صور متزامن من برومبت (text-to-image)
- ✅ تحويل صورة إلى صورة (image-to-image) — ارفع صورة مرجعية + برومبت
- ✅ توليد فيديو (text-to-video) عبر Sora 2 Pro, Veo 3.1, Wan 2.7, Kling v3, Seedance, Grok, Hailuo
- ✅ تحويل صورة إلى فيديو (image-to-video) — ارفع الإطار الأول
- ✅ السحب المباشر (SSE streaming) للصور المتوافقة (GPT-Image, GPT-5, GPT-5.4, OpenAI, Gemini)
- ✅ سجل بكل العمليات (history) مع تنزيل وحذف
- ✅ مصادقة JWT (تسجيل + دخول)
- ✅ واجهة عربية، تصميم داكن مُميّز، responsive (mobile + desktop)
- ✅ Docker + docker-compose جاهز

## المتطلبات

- `OPENROUTER_API_KEY` — مفتاح API من https://openrouter.ai/keys
- Docker (لتشغيل سريع) أو **Node 22+** لتطوير محلي (مطلوب لوحدة `node:sqlite` المدمجة)

> التطبيق الآن **تطبيق Next.js 15 واحد** (`apps/web`) يقدّم الواجهة والـ API من نفس المصدر — لا CORS ولا proxy. الكود منظّم كـ npm workspaces (`apps/*`, `packages/*`).

## التشغيل عبر Docker (الأسهل)

```bash
# 1) ضع مفتاحك في env
export OPENROUTER_API_KEY=sk-or-v1-xxxx
export JWT_SECRET=$(openssl rand -hex 32)

# 2) إبن وأشغل
docker compose up --build -d

# 3) افتح
# http://localhost:3000
```

## التطوير المحلي

كل شيء يعمل من جذر المستودع (npm workspaces، المنفذ 3000):
```bash
npm install
JWT_SECRET=$(openssl rand -hex 32) OPENROUTER_API_KEY=sk-or-v1-xxxx npm run dev
# افتح http://localhost:3000

npm run build   # بناء إنتاجي (.next/standalone)
npm start       # تشغيل البناء الإنتاجي
```

## المتغيرات البيئية

| المتغير | الوصف | افتراضي |
|---------|-------|---------|
| `OPENROUTER_API_KEY` | مفتاح OpenRouter | مطلوب |
| `JWT_SECRET` | سر JWT | dev-secret (غيّره في الإنتاج) |
| `PORT` | منفذ الخادم | 3000 |
| `DATA_DIR` | جذر البيانات (DB + مرفوعات + نتائج) | `<cwd>/data` |
| `DB_PATH` / `UPLOADS_DIR` / `ASSETS_DIR` | تجاوز مسارات فردية | داخل `DATA_DIR` |
| `APP_REFERER` | قيمة HTTP-Referer لـ OpenRouter | http://localhost:3000 |
| `APP_TITLE` | قيمة X-Title | OpenRouter Media Studio |

## المعمارية

```
 apps/web — Next.js 15 (UI + API على نفس المصدر، RTL، Tailwind)
      │  fetch /api/*  (lib/api.ts يحقن JWT)
      ▼
 app/api/**/route.ts  (route handlers، node:sqlite + JWT)
      ├── /api/auth/{register,login,me}
      ├── /api/models (+/image,/video)
      ├── /api/generate/image — توليد متزامن أو SSE
      ├── /api/generate/video — غير متزامن + poll خلفي
      ├── /api/generate/generations (+/[id], /[id]/poll)
      └── /api/assets/[filename]
      │
 packages/openrouter → OpenRouter API (https://openrouter.ai/api/v1)
```

## الترخيص

MIT — استخدم كما تريد.