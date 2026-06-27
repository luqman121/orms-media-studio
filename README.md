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
- Docker ( لدخول سريع) أو Node 20+ (لتطوير محلي)

## التشغيل عبر Docker (الأسهل)

```bash
# 1) ضع مفتاحك في env
export OPENROUTER_API_KEY=sk-or-v1-xxxx
export JWT_SECRET=$(openssl rand -hex 32)

# 2) إبن وأشغل
docker compose up --build -d

# 3) افتح
# http://localhost:3001
```

## التطوير المحلي

Backend (ポート 3001):
```bash
cd backend
npm install
OPENROUTER_API_KEY=sk-or-v1-xxxx \
JWT_SECRET=$(openssl rand -hex 32) \
npm start
```

Frontend (ポート 5173، يبروكسي /api إلى 3001):
```bash
cd frontend
npm install
npm run dev
# افتح http://localhost:5173
```

## المتغيرات البيئية

| المتغير | الوصف | افتراضي |
|---------|-------|---------|
| `OPENROUTER_API_KEY` | مفتاح OpenRouter | مطلوب |
| `JWT_SECRET` | سر JWT | dev-secret |
| `PORT` | منفذ الخادم | 3001 |
| `DB_PATH` | مسار SQLite | data/app.db |
| `UPLOADS_DIR` | مسار الصور المرفوعة | data/uploads |
| `ASSETS_DIR` | مسار النتائج | data/assets |
| `APP_REFERER` | قيمة HTTP-Referer لـ OpenRouter | http://localhost:3001 |
| `APP_TITLE` | قيمة X-Title | OpenRouter Media Studio |

## المعمارية

```
 frontend (Vite+React+Tailwind+RTL)
      │ fetch /api/*
      │
 backend (Express + SQLite + JWT)
      │
      ├── /api/auth           — register / login / me
      ├── /api/models         — list cached image + video models
      ├── /api/generate/image — POST /v1/images (sync or SSE stream)
      ├── /api/generate/video — POST /v1/videos (async, auto-poll)
      ├── /api/generations    — history list/detail/delete
      ├── /api/generate/generations/:id/poll — video status poll
      └── /api/assets/:file   — static generated asset
      │
 OpenRouter API (https://openrouter.ai/api/v1)
```

## الترخيص

MIT — استخدم كما تريد.