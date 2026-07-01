# ORMS Design System

**Project:** ORMS — AI Image & Video Generation Platform  
**File:** `design.md`  
**Direction:** Dark premium AI studio inspired by the provided Guru-style landing layouts, but using the **ORMS main website colors**: deep midnight background, violet gradient, blue/cyan highlights, soft glass panels, and RTL-first Arabic UI.

---

## 1. Product Identity

### Brand Positioning
ORMS is a premium AI studio for generating images and videos through one clean interface. The product should feel:

- **Premium**: like a serious SaaS product, not a basic tool.
- **Creative**: focused on image/video generation, prompts, assets, galleries, and inspiration.
- **Fast**: strong CTAs, clear generation flow, visible credits/status.
- **Modern Arabic-first**: RTL layout must feel native, not translated.
- **OpenRouter-powered**: the interface should communicate access to multiple models from one place.

### Core Visual Idea
Use the layout energy from the inspiration images:

- Large cinematic hero section.
- Dark editorial landing page.
- Big typography.
- Prompt box as the main product object.
- Gallery / masonry visual grid.
- Pricing blocks.
- Dashboard with studio panels.

But replace the green Guru identity with the ORMS identity:

- Deep purple/black background.
- Violet-to-blue-to-cyan gradients.
- Glassmorphism cards.
- Soft neon glow.
- Rounded premium UI.

---

## 2. Design Principles

### 2.1 One Clear Action
Every important screen should push the user toward one action:

- Landing page: **ابدأ التوليد الآن** / **جرّب مجانًا**
- Dashboard: **أنشئ مشروع جديد**
- Generator: **Generate** / **توليد**

Avoid showing too many equal CTAs.

### 2.2 Prompt First
The prompt input is the hero of the product. It should always feel central, powerful, and easy to use.

### 2.3 Dark, Not Flat
The UI should not be pure black only. Use layered dark surfaces:

- Page background.
- Main container surface.
- Card surface.
- Input surface.
- Hover surface.

This gives depth and makes the dashboard feel professional.

### 2.4 Premium Arabic RTL
Arabic text should be right-aligned by default. Spacing, icons, tabs, arrows, and sidebars should respect RTL direction.

### 2.5 Visual AI Energy
Use subtle animated details:

- Gradient blobs.
- Fine grid lines.
- Noise texture.
- Glow around buttons/cards.
- Tiny particles or dot matrix patterns.

Keep motion elegant, not distracting.

---

## 3. Color System

The palette is based on the provided ORMS main website screenshot.

### 3.1 Core Palette

| Token | Hex | Usage |
|---|---:|---|
| `--bg-950` | `#07040D` | Main page background, outside areas |
| `--bg-900` | `#100C1B` | Main app background |
| `--surface-900` | `#151126` | Cards, panels, dashboard surfaces |
| `--surface-850` | `#1B152D` | Elevated cards, modals |
| `--surface-800` | `#241B39` | Hover panels, selected rows |
| `--border-700` | `#2F264E` | Main border color |
| `--border-600` | `#433B5A` | Strong border / active border |
| `--text-100` | `#F4F7FF` | Primary text |
| `--text-200` | `#D4DBF4` | Secondary bright text |
| `--text-400` | `#A99AF1` | Muted purple text / labels |
| `--text-500` | `#8E88A8` | Muted text |
| `--primary-500` | `#864FF2` | Primary violet |
| `--primary-400` | `#9A68FF` | Hover violet |
| `--primary-600` | `#6B59E6` | Pressed violet |
| `--blue-500` | `#5195ED` | Blue gradient accent |
| `--cyan-500` | `#36C4F0` | Cyan accent / video features |
| `--success-500` | `#43F994` | Success only, not main brand |
| `--warning-500` | `#FFB35C` | Warnings / low credits |
| `--danger-500` | `#FF5C7A` | Errors / failed generation |

### 3.2 Brand Gradients

#### Primary ORMS Gradient
Use for logo, primary buttons, active tabs, and important badges.

```css
background: linear-gradient(135deg, #864FF2 0%, #6B59E6 42%, #36C4F0 100%);
```

#### Text Gradient
Use for main landing headline and section titles.

```css
background: linear-gradient(90deg, #A77BFF 0%, #6B8CFF 45%, #36C4F0 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

#### Premium Glow
Use behind hero cards and generator panels.

```css
box-shadow:
  0 0 0 1px rgba(134, 79, 242, 0.18),
  0 24px 80px rgba(134, 79, 242, 0.18),
  0 10px 40px rgba(54, 196, 240, 0.08);
```

### 3.3 Color Usage Rules

Do:

- Use violet as the main CTA color.
- Use cyan/blue for AI, video, generation, and active highlights.
- Use purple-muted text for labels and helper text.
- Use green only for success states, completed jobs, and positive indicators.

Do not:

- Do not copy the bright green Guru identity as the main color.
- Do not use pure white backgrounds.
- Do not use too many gradients in one card.
- Do not make every card glow; reserve glow for important areas.

---

## 4. Typography

### 4.1 Fonts

Recommended font stack:

```css
font-family: "IBM Plex Sans Arabic", "Tajawal", "Cairo", "Inter", system-ui, sans-serif;
```

For English display headings, optional:

```css
font-family: "Sora", "Inter", system-ui, sans-serif;
```

### 4.2 Arabic Typography Rules

- Arabic UI should use clear modern fonts, not decorative fonts.
- Use bold Arabic headlines with generous line-height.
- Avoid very thin Arabic weights on dark background.
- Keep paragraphs readable and not too small.

### 4.3 Type Scale

| Token | Size | Line Height | Weight | Usage |
|---|---:|---:|---:|---|
| `display-1` | 72px | 1.02 | 800 | Desktop hero heading |
| `display-2` | 56px | 1.08 | 800 | Section hero / large titles |
| `h1` | 44px | 1.15 | 800 | Page title |
| `h2` | 36px | 1.2 | 750 | Section title |
| `h3` | 28px | 1.25 | 700 | Card groups |
| `h4` | 22px | 1.35 | 700 | Card title |
| `body-lg` | 18px | 1.8 | 400 | Landing paragraphs |
| `body` | 16px | 1.75 | 400 | Normal text |
| `body-sm` | 14px | 1.65 | 400 | Dashboard text |
| `caption` | 12px | 1.5 | 500 | Labels, badges |

### 4.4 Mobile Type Scale

| Token | Mobile Size |
|---|---:|
| `display-1` | 42px |
| `display-2` | 36px |
| `h1` | 32px |
| `h2` | 28px |
| `body-lg` | 16px |

---

## 5. Layout System

### 5.1 Global Container

```css
.container-page {
  width: min(100% - 32px, 1280px);
  margin-inline: auto;
}
```

Recommended widths:

| Area | Max Width |
|---|---:|
| Landing content | 1280px |
| Hero text | 920px |
| Dashboard app | Full width |
| Generator canvas | 1440px |
| Modals | 520px / 720px / 960px |

### 5.2 Spacing Scale

| Token | Value |
|---|---:|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |
| `space-16` | 64px |
| `space-20` | 80px |
| `space-24` | 96px |

### 5.3 Border Radius

| Token | Value | Usage |
|---|---:|---|
| `radius-sm` | 10px | Small inputs, badges |
| `radius-md` | 16px | Buttons, cards |
| `radius-lg` | 22px | Main cards |
| `radius-xl` | 28px | Hero generator, dashboard panels |
| `radius-2xl` | 36px | Large landing containers |
| `radius-full` | 999px | Pills, avatars |

### 5.4 Borders

Default dark border:

```css
border: 1px solid rgba(169, 154, 241, 0.14);
```

Active border:

```css
border: 1px solid rgba(134, 79, 242, 0.55);
```

Cyan focus border:

```css
border: 1px solid rgba(54, 196, 240, 0.65);
```

---

## 6. Visual Effects

### 6.1 Page Background

Use a deep background with gradient glow:

```css
body {
  background:
    radial-gradient(circle at 50% 0%, rgba(134, 79, 242, 0.18), transparent 36%),
    radial-gradient(circle at 85% 20%, rgba(54, 196, 240, 0.10), transparent 30%),
    #07040D;
}
```

### 6.2 Grid Overlay

Use very subtle grid lines like the inspiration images, but purple/cyan:

```css
.bg-grid {
  background-image:
    linear-gradient(rgba(169, 154, 241, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(169, 154, 241, 0.07) 1px, transparent 1px);
  background-size: 72px 72px;
}
```

### 6.3 Noise Overlay

Add a soft noise overlay at low opacity to prevent flat gradients.

```css
.noise::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("/noise.png");
  mix-blend-mode: screen;
}
```

### 6.4 Glow Orb

```css
.glow-orb {
  width: 420px;
  height: 420px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(134,79,242,.32), rgba(54,196,240,.08), transparent 70%);
  filter: blur(20px);
}
```

---

## 7. Iconography

Recommended icon style:

- Use thin/medium line icons.
- Stroke width: 1.75px to 2px.
- Rounded caps.
- Icons should be white/muted by default.
- Active icons can use violet/cyan gradient background.

Suggested icons:

| Feature | Icon Direction |
|---|---|
| Image generation | Sparkles / Image |
| Video generation | Play / Film |
| Prompt builder | Wand / Pen line |
| Model selection | Layers / Brain |
| Gallery | Grid / Images |
| Credits | Coins / Zap |
| Queue | Clock / Loader |
| Settings | Sliders |
| Download | Download cloud |
| Upscale | Maximize |

---

## 8. Logo System

### 8.1 Logo Mark

The logo should follow the main website style:

- Rounded square mark.
- Violet-to-cyan gradient.
- White `ORMS` or simplified mark.
- Soft inner glow.

CSS direction:

```css
.logo-mark {
  width: 64px;
  height: 64px;
  border-radius: 22px;
  background: linear-gradient(135deg, #864FF2, #5195ED 55%, #36C4F0);
  box-shadow: 0 18px 45px rgba(134, 79, 242, 0.35);
}
```

### 8.2 Logo Usage

- Landing hero: large logo mark above headline.
- Dashboard: compact mark in sidebar.
- Mobile: mark only or mark + `ORMS`.
- Never place the logo on light background.

---

## 9. Components

## 9.1 Buttons

### Primary Button
Use for main conversion actions.

```css
.btn-primary {
  background: linear-gradient(135deg, #864FF2, #6B59E6 50%, #36C4F0);
  color: #FFFFFF;
  border-radius: 16px;
  height: 52px;
  padding-inline: 24px;
  font-weight: 800;
  box-shadow: 0 16px 40px rgba(134, 79, 242, 0.28);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 55px rgba(134, 79, 242, 0.38);
}
```

Arabic examples:

- `ابدأ التوليد الآن`
- `جرّب مجانًا`
- `أنشئ صورة`
- `أنشئ فيديو`

### Secondary Button

```css
.btn-secondary {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(169, 154, 241, 0.18);
  color: #F4F7FF;
  border-radius: 16px;
}
```

Examples:

- `شاهد الديمو`
- `استكشف المعرض`
- `قارن الباقات`

### Ghost Button

Use in navbar and secondary dashboard actions.

```css
.btn-ghost {
  background: transparent;
  color: #A99AF1;
}

.btn-ghost:hover {
  background: rgba(169, 154, 241, 0.08);
  color: #F4F7FF;
}
```

---

## 9.2 Cards

### Default Card

```css
.card {
  background: rgba(21, 17, 38, 0.82);
  border: 1px solid rgba(169, 154, 241, 0.14);
  border-radius: 24px;
  backdrop-filter: blur(18px);
}
```

### Featured Card

```css
.card-featured {
  background:
    linear-gradient(180deg, rgba(134, 79, 242, 0.12), rgba(21, 17, 38, 0.92)),
    rgba(21, 17, 38, 0.88);
  border: 1px solid rgba(134, 79, 242, 0.42);
  box-shadow: 0 24px 80px rgba(134, 79, 242, 0.18);
}
```

### Card Rules

- Card padding: 24px desktop, 18px mobile.
- Minimum card radius: 20px.
- Use thin borders to separate dark layers.
- On hover, lift cards slightly and brighten border.

---

## 9.3 Inputs

### Standard Input

```css
.input {
  background: #100C1B;
  border: 1px solid rgba(169, 154, 241, 0.16);
  color: #F4F7FF;
  border-radius: 18px;
  min-height: 54px;
  padding: 0 18px;
}

.input:focus {
  outline: none;
  border-color: rgba(54, 196, 240, 0.72);
  box-shadow: 0 0 0 4px rgba(54, 196, 240, 0.10);
}
```

### Prompt Textarea

The prompt composer is a key brand element.

```css
.prompt-box {
  min-height: 148px;
  background: linear-gradient(180deg, #100C1B, #0B0814);
  border: 1px solid rgba(134, 79, 242, 0.28);
  border-radius: 28px;
  padding: 20px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
}
```

Prompt placeholder examples:

- `اكتب وصف الصورة التي تريد إنشاءها...`
- `مثال: إعلان سينمائي لعطر فاخر على خلفية بنفسجية مضيئة`
- `اكتب مشهد الفيديو، الحركة، الإضاءة، والأسلوب...`

---

## 9.4 Tabs

Use segmented tabs like the main website login/sign-up control.

```css
.segmented-tabs {
  background: #0E0A19;
  border-radius: 22px;
  padding: 6px;
  display: flex;
  gap: 6px;
}

.segmented-tab-active {
  background: linear-gradient(135deg, #864FF2, #9A68FF);
  color: #FFFFFF;
  border-radius: 17px;
}
```

Landing/generator tabs:

- `صورة`
- `فيديو`
- `Illustration`
- `3D`
- `Upscale`
- `Edit`

---

## 9.5 Badges

```css
.badge {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(134, 79, 242, 0.14);
  border: 1px solid rgba(134, 79, 242, 0.22);
  color: #D4DBF4;
}
```

Badge examples:

- `OpenRouter`
- `Image AI`
- `Video AI`
- `Fast Mode`
- `Pro Model`
- `Beta`

---

## 9.6 Navbar

### Desktop Navbar

- Height: 72px.
- Transparent over hero, then dark blur on scroll.
- Logo on right for RTL Arabic.
- Links in center.
- CTA on left.

Suggested links:

- `الرئيسية`
- `المميزات`
- `المعرض`
- `الباقات`
- `الأسئلة`

CTA:

- `ابدأ الآن`

### Navbar Style

```css
.navbar {
  background: rgba(7, 4, 13, 0.64);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(169, 154, 241, 0.10);
}
```

---

## 9.7 Sidebar

Dashboard sidebar should feel like a studio control room.

Width:

- Desktop: 280px.
- Collapsed: 84px.
- Mobile: drawer.

Navigation:

- `لوحة التحكم`
- `المولّد`
- `المشاريع`
- `المعرض`
- `النماذج`
- `الفواتير`
- `الإعدادات`

Sidebar item:

```css
.sidebar-item {
  height: 46px;
  border-radius: 14px;
  color: #A99AF1;
}

.sidebar-item-active {
  background: linear-gradient(135deg, rgba(134,79,242,.22), rgba(54,196,240,.10));
  color: #F4F7FF;
  border: 1px solid rgba(134,79,242,.28);
}
```

---

## 10. Landing Page Design

The landing page should combine the cinematic structure from the inspiration images with the ORMS visual identity.

## 10.1 Landing Page Sections

### Section 1 — Hero

Goal: Make the visitor instantly understand the product.

Suggested structure:

1. Navbar.
2. Logo mark.
3. Small badge: `مولّد الصور والفيديو بالذكاء الاصطناعي عبر OpenRouter`
4. Big headline.
5. Subheadline.
6. CTA row.
7. Large prompt generator preview.
8. Model/partner strip.

Suggested headline:

```text
أنشئ صورًا وفيديوهات احترافية من مجرد فكرة واحدة
```

Alternative:

```text
حوّل أفكارك إلى صور وفيديوهات جاهزة خلال ثوانٍ
```

Suggested subheadline:

```text
منصة ORMS تجمع نماذج الذكاء الاصطناعي عبر OpenRouter في واجهة واحدة لتوليد الصور، الفيديوهات، الإعلانات، والمحتوى الإبداعي بسرعة واحتراف.
```

CTA buttons:

- Primary: `ابدأ التوليد الآن`
- Secondary: `شاهد كيف يعمل`

Hero prompt preview:

- Large dark card.
- Centered prompt textarea.
- Mode pills: `صورة`, `فيديو`, `إعلان`, `3D`.
- Generate button.
- Floating mini-cards around it: `Fast`, `4K`, `OpenRouter`, `Video Ready`.

### Section 2 — Trust / Models Strip

Use a slim strip under hero like the inspiration image partners row.

Possible labels:

- `OpenRouter`
- `Image Models`
- `Video Models`
- `Upscale`
- `Prompt Builder`
- `Creative Studio`

Design:

- One horizontal dark strip.
- Small icons.
- Muted text.
- Border top and bottom.

### Section 3 — Use Cases

Use an editorial layout similar to the inspiration image cards.

Title:

```text
استخدم ORMS لكل أنواع المحتوى الإبداعي
```

Cards:

1. `إعلانات المنتجات`
2. `صور السوشيال ميديا`
3. `فيديوهات قصيرة`
4. `تصاميم المتاجر`
5. `Mockups`
6. `صور واقعية`
7. `مشاهد سينمائية`
8. `أفكار UGC`

Each card should include:

- Visual thumbnail.
- Small badge.
- Short explanation.
- CTA: `جرّب هذا النمط`

### Section 4 — Prompt Builder

Inspired by “Build the Perfect Prompt”.

Title:

```text
ابنِ Prompt أقوى بدون خبرة تقنية
```

Feature list:

- اقتراحات فورية لتحسين الوصف.
- اختيار الأسلوب البصري.
- ضبط الإضاءة، العدسة، الحركة، والألوان.
- قوالب جاهزة للإعلانات والمحتوى.
- منع الكلمات الضعيفة أو غير الواضحة.

Visual:

- Left: text and checklist.
- Right: animated prompt assistant panel.
- Background: binary/dot matrix pattern in violet/cyan.

### Section 5 — Gallery / Inspiration Wall

Inspired by the masonry gallery screenshot.

Title:

```text
معرض إلهام متجدد
```

Filters:

- `الكل`
- `صور`
- `فيديو`
- `منتجات`
- `إعلانات`
- `سينمائي`

Gallery style:

- Masonry layout.
- Rounded image cards.
- Hover overlay with prompt snippet.
- Button: `انسخ الـ Prompt`.
- Button: `استخدم كنموذج`.

### Section 6 — Features Grid

Six feature cards:

1. `توليد الصور`
2. `توليد الفيديو`
3. `تحسين البرومبت`
4. `نماذج متعددة عبر OpenRouter`
5. `حفظ المشاريع والمعرض`
6. `تصدير وتنزيل سريع`

### Section 7 — Pricing

Inspired by “A plan for every need”.

Title:

```text
باقات تناسب كل مستوى
```

Billing toggle:

- `شهري`
- `سنوي`

Recommended packages:

#### Starter
- مناسب للتجربة.
- Credits محدودة.
- توليد صور أساسي.
- معرض شخصي.

#### Creator
- أفضل خيار للمصممين وصناع المحتوى.
- Credits أعلى.
- Image + Video.
- Prompt templates.
- Priority queue.

#### Pro Studio
- مناسب للشركات والفرق.
- Credits كبيرة.
- نماذج Pro.
- Team workspace.
- Brand presets.

CTA:

- `ابدأ الآن`
- `ترقية إلى Pro`

### Section 8 — Final CTA

Title:

```text
ابدأ تحويل أفكارك إلى محتوى بصري اليوم
```

Text:

```text
اكتب الفكرة، اختر نوع المحتوى، واترك ORMS يحوّلها إلى صورة أو فيديو جاهز للاستخدام.
```

CTA:

- `جرّب ORMS الآن`

### Section 9 — Footer

Footer columns:

- المنتج: `المولّد`, `المعرض`, `الباقات`
- الموارد: `قوالب Prompts`, `دليل الاستخدام`, `الأسئلة`
- الشركة: `من نحن`, `تواصل معنا`, `الشروط`
- الحساب: `تسجيل الدخول`, `إنشاء حساب`

Footer should include large low-opacity `ORMS` watermark text or gradient logo mark.

---

## 11. Dashboard Design

## 11.1 Dashboard Goal

The dashboard is where the user manages credits, projects, generations, saved assets, and recent activity.

It should feel like a professional AI studio.

## 11.2 Dashboard Layout

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar: Search / Create / Credits / Profile                 │
├──────────────┬───────────────────────────────────────────────┤
│ Sidebar      │ Main Content                                  │
│              │ Stats Cards                                   │
│              │ Recent Generations                            │
│              │ Projects / Queue / Gallery                    │
└──────────────┴───────────────────────────────────────────────┘
```

### Sidebar
Right side for Arabic RTL.

### Top Bar
Elements:

- Search input: `ابحث في مشاريعك...`
- Quick button: `توليد جديد`
- Credits badge: `1,250 credits`
- Notifications.
- User avatar.

### Main Cards
Dashboard top stats:

1. `Credits المتبقية`
2. `صور تم توليدها`
3. `فيديوهات تم توليدها`
4. `مشاريع نشطة`

### Recent Generations
Table/card grid with:

- Thumbnail.
- Prompt title/snippet.
- Type: image/video.
- Model.
- Status.
- Created date.
- Actions: download, reuse, delete.

### Queue Panel
Show active generation jobs:

- `قيد التوليد`
- `تم بنجاح`
- `فشل`
- Progress bar.

### Empty State
When no generations exist:

Title:

```text
ابدأ أول مشروع إبداعي لك
```

Text:

```text
اكتب وصفًا بسيطًا، اختر صورة أو فيديو، وسيقوم ORMS بالباقي.
```

Button:

```text
افتح المولّد
```

---

## 12. Generator Dashboard

## 12.1 Generator Goal

This is the main product experience. The user should be able to create images/videos without feeling overwhelmed.

## 12.2 Generator Layout

Desktop recommended layout:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Bar: Project name / Save / Credits / Generate                  │
├───────────────────┬──────────────────────────────┬────────────────┤
│ Settings Panel    │ Main Preview Canvas           │ History Panel  │
│                   │ Prompt Box                    │                │
│ Mode              │ Generated Output              │ Recent assets  │
│ Model             │ Variations                     │ Saved prompts  │
│ Aspect Ratio      │                               │                │
│ Style             │                               │                │
│ Advanced          │                               │                │
└───────────────────┴──────────────────────────────┴────────────────┘
```

For RTL:

- Settings panel can be on the right.
- History panel can be on the left.
- Preview canvas stays center.

## 12.3 Generator Modes

Main mode tabs:

- `صورة`
- `فيديو`
- `تعديل صورة`
- `تحسين جودة`
- `تحويل نص إلى مشهد`

Each mode changes settings and placeholders.

### Image Mode Settings

- Model.
- Aspect ratio: `1:1`, `4:5`, `16:9`, `9:16`.
- Style: `Realistic`, `Cinematic`, `Product`, `Anime`, `3D`, `Illustration`.
- Quality: `Standard`, `HD`, `Ultra`.
- Number of images: 1, 2, 4.
- Negative prompt.
- Seed.

### Video Mode Settings

- Model.
- Duration: 5s, 10s, 15s.
- Aspect ratio: `16:9`, `9:16`, `1:1`.
- Camera motion: `Static`, `Pan`, `Zoom`, `Dolly`, `Handheld`.
- Motion intensity.
- Style.
- Reference image upload.

### Prompt Box Layout

Prompt box should include:

- Large textarea.
- Prompt helper button: `حسّن البرومبت`.
- Random inspiration button: `فكرة عشوائية`.
- Template button: `قالب جاهز`.
- Generate button.
- Cost preview: `سيتم استخدام 20 credits`.

### Main Preview Canvas

Before generation:

- Show elegant empty canvas.
- Large icon.
- Text: `النتيجة ستظهر هنا`.
- Example prompt cards.

During generation:

- Animated gradient border.
- Progress indicator.
- Message: `جاري توليد الصورة...`
- Estimated time.

After generation:

- Output image/video.
- Action buttons:
  - `تحميل`
  - `تعديل`
  - `إنشاء نسخة أخرى`
  - `حفظ في المشروع`
  - `نسخ Prompt`

### History Panel

Contains:

- Recent generations.
- Saved prompts.
- Favorite outputs.
- Failed jobs retry button.

---

## 13. Component States

### Loading

Use skeleton panels with purple shimmer.

```css
.skeleton {
  background: linear-gradient(90deg, #151126, #241B39, #151126);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
```

### Success

- Use `#43F994` only for status dots and completed labels.
- Avoid turning big buttons green.

### Error

Error message style:

- Dark red-tinted panel.
- Red border.
- Clear retry action.

Text example:

```text
تعذر توليد النتيجة. جرّب تعديل البرومبت أو اختر نموذجًا آخر.
```

### Empty

Empty states should be useful and action-oriented.

### Disabled

Use low opacity, but keep text readable.

---

## 14. Motion System

### 14.1 Timing

| Motion | Duration | Easing |
|---|---:|---|
| Small hover | 160ms | ease-out |
| Card lift | 220ms | cubic-bezier(.2,.8,.2,1) |
| Modal open | 260ms | cubic-bezier(.16,1,.3,1) |
| Page reveal | 500ms | ease-out |
| Glow pulse | 3s–6s | ease-in-out |

### 14.2 Approved Animations

- Button hover lift.
- Card border glow on hover.
- Slow hero gradient movement.
- Prompt box focus glow.
- Generation loading pulse.
- Gallery image hover zoom: max `scale(1.04)`.

### 14.3 Avoid

- Fast flashing effects.
- Too many moving particles.
- Heavy animations that affect performance.
- Large layout shifts.

---

## 15. Responsive Design

### Breakpoints

| Name | Width |
|---|---:|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

### Mobile Rules

Landing:

- Hero headline max 42px.
- CTA buttons stack vertically.
- Prompt preview full width.
- Gallery becomes 1–2 columns.
- Pricing cards stack.

Dashboard:

- Sidebar becomes drawer.
- Top bar simplified.
- Stats become 2 columns or 1 column.
- Tables become cards.

Generator:

- Main canvas first.
- Settings panel collapses into bottom sheet or accordion.
- History panel hidden behind tab.
- Generate button sticky bottom.

---

## 16. Accessibility

Minimum rules:

- Text contrast must be readable on dark background.
- Do not use color only for status; include text or icons.
- Focus states must be visible.
- Buttons must have clear labels.
- Inputs must have labels, not placeholder only.
- Support keyboard navigation.
- Motion should be subtle and not essential.

Focus ring:

```css
:focus-visible {
  outline: 2px solid #36C4F0;
  outline-offset: 3px;
}
```

---

## 17. Content Tone

### Arabic Voice

Tone should be:

- Clear.
- Confident.
- Professional.
- Not too formal.
- Action-focused.

Good phrases:

- `حوّل فكرتك إلى صورة أو فيديو خلال ثوانٍ`
- `اكتب الوصف واترك ORMS يكمل الباقي`
- `نماذج متعددة، واجهة واحدة`
- `مصمم لصنّاع المحتوى، المسوقين، والمتاجر`

Avoid:

- Overpromising impossible results.
- Too much technical jargon on landing page.
- Long paragraphs.

---

## 18. Tailwind Tokens

Recommended Tailwind color extension:

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg: {
          950: "#07040D",
          900: "#100C1B",
        },
        surface: {
          900: "#151126",
          850: "#1B152D",
          800: "#241B39",
        },
        border: {
          700: "#2F264E",
          600: "#433B5A",
        },
        text: {
          100: "#F4F7FF",
          200: "#D4DBF4",
          400: "#A99AF1",
          500: "#8E88A8",
        },
        primary: {
          400: "#9A68FF",
          500: "#864FF2",
          600: "#6B59E6",
        },
        blue: {
          500: "#5195ED",
        },
        cyan: {
          500: "#36C4F0",
        },
        success: {
          500: "#43F994",
        },
        warning: {
          500: "#FFB35C",
        },
        danger: {
          500: "#FF5C7A",
        },
      },
      borderRadius: {
        smx: "10px",
        mdx: "16px",
        lgx: "22px",
        xlx: "28px",
        "2xlx": "36px",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(134, 79, 242, 0.18)",
        cyanGlow: "0 20px 70px rgba(54, 196, 240, 0.12)",
      },
    },
  },
};
```

---

## 19. CSS Variables

Use these in `globals.css`:

```css
:root {
  --bg-950: #07040D;
  --bg-900: #100C1B;

  --surface-900: #151126;
  --surface-850: #1B152D;
  --surface-800: #241B39;

  --border-700: #2F264E;
  --border-600: #433B5A;

  --text-100: #F4F7FF;
  --text-200: #D4DBF4;
  --text-400: #A99AF1;
  --text-500: #8E88A8;

  --primary-400: #9A68FF;
  --primary-500: #864FF2;
  --primary-600: #6B59E6;
  --blue-500: #5195ED;
  --cyan-500: #36C4F0;

  --success-500: #43F994;
  --warning-500: #FFB35C;
  --danger-500: #FF5C7A;

  --gradient-brand: linear-gradient(135deg, #864FF2 0%, #6B59E6 42%, #36C4F0 100%);
  --gradient-text: linear-gradient(90deg, #A77BFF 0%, #6B8CFF 45%, #36C4F0 100%);

  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;
  --radius-2xl: 36px;
}
```

---

## 20. Recommended Page Structure

```text
app/
  page.tsx                         Landing page
  dashboard/
    page.tsx                       Main dashboard
  generator/
    page.tsx                       Generator dashboard
  gallery/
    page.tsx                       Public/private gallery
  pricing/
    page.tsx                       Pricing page
components/
  layout/
    Navbar.tsx
    Footer.tsx
    DashboardShell.tsx
    Sidebar.tsx
    Topbar.tsx
  landing/
    HeroSection.tsx
    PromptPreview.tsx
    ModelStrip.tsx
    UseCasesSection.tsx
    PromptBuilderSection.tsx
    GalleryPreview.tsx
    PricingSection.tsx
    FinalCTA.tsx
  generator/
    GeneratorShell.tsx
    PromptComposer.tsx
    ModeTabs.tsx
    SettingsPanel.tsx
    PreviewCanvas.tsx
    HistoryPanel.tsx
    ModelSelector.tsx
    AspectRatioPicker.tsx
  ui/
    Button.tsx
    Card.tsx
    Input.tsx
    Textarea.tsx
    Badge.tsx
    Tabs.tsx
    Modal.tsx
    Toast.tsx
    Dropdown.tsx
    Skeleton.tsx
```

---

## 21. Landing Page Wireframe

```text
[Navbar]

[Hero]
  Badge: OpenRouter AI Studio
  Big gradient headline
  Subheadline
  CTA buttons
  Prompt generator preview card

[Model Strip]
  OpenRouter / Image / Video / Upscale / Prompt Builder

[Use Cases]
  Editorial cards + visual thumbnails

[Prompt Builder]
  Text + feature checklist + prompt assistant visual

[Gallery]
  Masonry grid with generated outputs

[Features]
  6 cards

[Pricing]
  3 packages + billing toggle

[Final CTA]

[Footer]
```

---

## 22. Dashboard Wireframe

```text
[Dashboard Shell]
  [Right Sidebar]
  [Topbar]
  [Main]
    Stats cards
    Quick generator card
    Recent generations
    Active queue
    Saved projects
```

---

## 23. Generator Wireframe

```text
[Generator Shell]
  [Topbar]
    Project name / Credits / Save / Generate

  [Right Settings Panel]
    Mode tabs
    Model selector
    Aspect ratio
    Style
    Quality
    Advanced settings

  [Center]
    Prompt composer
    Preview canvas
    Output actions

  [Left History Panel]
    Recent generations
    Saved prompts
    Favorites
```

---

## 24. Microcopy Library

### CTAs

- `ابدأ التوليد الآن`
- `جرّب مجانًا`
- `شاهد الديمو`
- `افتح المولّد`
- `أنشئ مشروع جديد`
- `حسّن البرومبت`
- `ولّد صورة`
- `ولّد فيديو`
- `استخدم كنموذج`

### Status Text

- `جاري التوليد...`
- `تم إنشاء النتيجة بنجاح`
- `فشل التوليد، حاول مرة أخرى`
- `تم حفظ المشروع`
- `تم نسخ الـ Prompt`
- `Credits غير كافية`

### Empty States

- `لا توجد نتائج بعد`
- `ابدأ بكتابة أول Prompt لك`
- `احفظ نتائجك المفضلة هنا`

---

## 25. Image & Video Card Design

### Image Card

Contains:

- Thumbnail.
- Type badge.
- Prompt snippet.
- Model name.
- Hover actions.

Hover actions:

- Download.
- Reuse prompt.
- Favorite.
- Delete.

### Video Card

Contains:

- Video thumbnail.
- Play icon.
- Duration badge.
- Status badge.
- Actions.

### Card Style

```css
.asset-card {
  border-radius: 22px;
  overflow: hidden;
  background: #151126;
  border: 1px solid rgba(169, 154, 241, 0.14);
}

.asset-card:hover {
  border-color: rgba(54, 196, 240, 0.42);
  transform: translateY(-2px);
}
```

---

## 26. Pricing Component

### Pricing Card Structure

```text
Plan name
Short description
Price
Credits included
Feature list
CTA
```

### Recommended Visual Hierarchy

- Featured plan should be centered and slightly larger.
- Use gradient border for featured plan.
- Use small badge: `الأكثر اختيارًا`.
- Keep pricing simple.

---

## 27. Authentication Pages

The login/register pages should stay close to the main website screenshot.

### Auth Card

- Centered card.
- Logo at top.
- Gradient heading.
- Segmented tabs: `حساب جديد` / `دخول`.
- Rounded inputs.
- Primary gradient button.
- Dark background.

### Auth Page Copy

Title:

```text
استوديو الصور والفيديو
```

Subtitle:

```text
بدفعة واحدة عبر OpenRouter
```

Fields:

- `الاسم (اختياري)`
- `البريد الإلكتروني`
- `كلمة المرور`

---

## 28. Design QA Checklist

Before shipping, check:

- The website uses ORMS violet/blue/cyan colors, not green as primary.
- RTL Arabic layout is correct.
- Hero section has one clear CTA.
- Prompt box is visually central.
- Dashboard is not overcrowded.
- Generator can be used on mobile.
- Cards have consistent radius and border.
- Loading, error, empty, and success states exist.
- Text contrast is readable.
- All buttons have hover/focus states.
- Pricing is easy to understand.
- Gallery images do not break layout.
- No large animations hurt performance.

---

## 29. Developer Implementation Notes

1. Build the landing page first using static components and mock data.
2. Then build dashboard shell and generator layout.
3. Keep all colors in CSS variables or Tailwind tokens.
4. Do not hard-code random colors in components.
5. Components must support RTL from the start.
6. Use reusable UI primitives: Button, Card, Badge, Tabs, Input, Modal.
7. Keep generator settings modular because image and video modes need different options.
8. The design must work without real API connection first; use mock generation cards.
9. Add API integration only after the UI flow is stable.
10. Keep the visual style consistent with the ORMS auth/main screenshot.

---

## 30. Final Design Direction Summary

ORMS should look like a premium dark AI creation studio:

- **Visual language:** midnight violet, soft neon cyan, glass panels, grid/noise details.
- **Landing page:** cinematic, editorial, prompt-first, gallery-heavy, pricing-ready.
- **Dashboard:** professional SaaS workspace with credits, projects, queue, and recent generations.
- **Generator:** clean three-zone studio layout with settings, prompt, preview, and history.
- **Arabic UX:** RTL-native, clear, direct, and conversion-focused.

The final product should feel like: **“Guru-style creative AI landing page + ORMS purple/blue identity + professional SaaS dashboard.”**
