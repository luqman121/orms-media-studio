---
name: orms-arabic-rtl
description: Load before creating or modifying any user-facing UI text, layouts, components, or error messages in apps/web. Enforces Arabic-default localization with English support, RTL-native and LTR layouts, centralized message catalogs, correct mixed Arabic/English rendering (e.g. model names), accessibility, and mobile responsiveness. Use for Phase 3 (next-intl) localization work.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-arabic-rtl

## When to use
For all Phase 3 localization work and whenever adding or changing customer-facing strings,
layout direction, or RTL/LTR behavior in `apps/web`.

## Files to inspect first
- `DESIGN.md` (RTL-first design rules, microcopy library, section copy)
- `CLAUDE.md` ("Design system" section — RTL-first Arabic rules)
- `apps/web/components/DashboardShell.tsx` (locale switcher target)
- any component/page under `apps/web/app/**` and `apps/web/components/**` containing hard-coded Arabic
- `apps/web/lib/credits.ts`, `apps/web/lib/http.ts`, `packages/model-router/src/openrouter.ts`
  (hard-coded Arabic error messages to migrate to catalogs)
- `IMPLEMENTATION_PLAN.md` §9 Phase 3

## Required workflow
1. Add **next-intl** (no i18n exists today). Arabic **default**, **English** support.
2. Use cookie-based locale preference; prefer next-intl "without i18n routing" to avoid
   restructuring routes into `app/[locale]/`. Compute `dir` from locale.
3. Add a locale switcher in `apps/web/components/DashboardShell.tsx`.
4. Create centralized message catalogs (e.g. `apps/web/messages/ar.json`, `apps/web/messages/en.json`);
   migrate hard-coded Arabic strings **incrementally**.
5. Localize user-facing errors; ensure correct rendering of mixed Arabic + English model names.
6. Verify both **RTL and LTR** on tabs/sliders/dialogs/forms and on mobile widths.

## Invariants
- Arabic is the default; English is a supported, switchable locale.
- Both `rtl` and `ltr` layouts are correct (sidebar right in RTL, left in LTR).
- Customer-facing strings live in **central catalogs**, not scattered literals.
- Mixed Arabic/English (e.g. English model names inside Arabic sentences) renders correctly
  with proper bidi handling.
- All new user-facing strings are Arabic-first; reuse the `DESIGN.md` microcopy library.

## Prohibited shortcuts
- Leaving hard-coded Arabic scattered while shipping new hard-coded strings.
- Translating ad hoc instead of reusing the catalog microcopy.
- Assuming LTR-only layouts; mirror/flip according to `dir`.
- Breaking model-name display with naive concatenation.

## Verification commands
```bash
npm --workspace apps/web run lint
npm run build
# Manual + Playwright (Phase 5): switch locale; verify dir flip and mixed-name rendering at 375/768/1024/1440.
```

## Evidence required before claiming completion
- Catalog files exist and are actually consumed (no remaining hard-coded customer-facing strings in changed components).
- Demonstration of Arabic default + English switch with correct `dir` flip.
- Responsive + accessibility check across breakpoints.

## Definition of done
ORMS is Arabic-default with a working English locale via next-intl, centralized catalogs,
correct RTL/LTR + mixed-script rendering, accessibility, and mobile responsiveness — verified
visually and with Playwright.