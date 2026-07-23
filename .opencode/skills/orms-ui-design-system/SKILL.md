---
name: orms-ui-design-system
description: Load before writing or changing any frontend code (components, pages, layouts, styles) in apps/web. Authoritative ORMS design-system skill grounded in the repo's own DESIGN.md. Enforces the dark-premium-studio visual identity, token usage over hard-coded literals, RTL-first Arabic layouts, required interactive states, and reusable primitives. Prohibits generic AI-dashboard styling and third-party branding. Read DESIGN.md fully before acting.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-ui-design-system

## When to use
Before **any** UI work — building, restyling, or reviewing components/pages/layouts/styles in
`apps/web`. This is the project-native replacement for third-party UI skill bundles.

## Files to inspect first
- `DESIGN.md` (the authoritative ORMS design system — read it in full before acting)
- `CLAUDE.md` ("Design system" non-negotiable rules)
- `apps/web/tailwind.config.*`, `apps/web/app/globals.css` (tokens)
- `apps/web/components/**` (existing primitives/patterns)
- `IMPLEMENTATION_PLAN.md` §4, §5, §9 Phase 4

## Required workflow
1. Read `DESIGN.md` in full; pull tokens, spacing, radii, microcopy, wireframes, and the §24
   copy library from it — do **not** invent values.
2. Use CSS variables (`DESIGN.md` §19) or Tailwind tokens (§18); never hard-code hex/spacing/radius.
3. Build on shared primitives (Button, Card, Input, Textarea, Badge, Tabs, Modal, Skeleton);
   keep generator image/video settings modular (§20, §29).
4. Keep the prompt composer as the hero element; each screen pushes one clear primary CTA (§2).
5. Implement every required state: loading (purple shimmer skeleton), success, error, empty,
   disabled, and visible `:focus-visible` cyan ring (§13, §16).
6. Implement the components/areas the plan calls for: dashboard layouts, asset cards, project
   cards, generation status, and responsive behavior — all grounded in `DESIGN.md`.
7. Respect `prefers-reduced-motion`.

## Invariants (from DESIGN.md)
- Palette: midnight background (`#07040D`/`#100C1B`), violet primary (`#864FF2`), blue/cyan accents
  (`#5195ED`/`#36C4F0`). Green (`#43F994`) is **success states only**, never primary/brand.
- **No pure-white backgrounds.**
- **Tokens over literals** — always.
- **RTL-first Arabic**: sidebar on the right, history panel on the left; all user-facing strings
  Arabic-first via the microcopy library.
- Responsive + accessible; visible focus; reduced-motion support.

## Prohibited shortcuts
- Generic AI-dashboard styling or unrelated hard-coded colors.
- Copying third-party branding (e.g. guru-site greens, or any bundle's identity).
- Skipping required interactive states or focus styling.
- Adding unscoped hex/spacing/radius literals in components.

## Verification commands
```bash
npm --workspace apps/web run lint
npm run build
# Run the DESIGN.md §28 "Design QA checklist" before declaring UI work done.
```

## Evidence required before claiming completion
- Components consume design tokens (no stray literals in changed files).
- All required states present and visible; focus ring cyan.
- RTL/LTR correct; responsive at 375/768/1024/1440; reduced-motion respected.
- DESIGN.md §28 Design QA checklist completed.

## Definition of done
UI is grounded entirely in `DESIGN.md`, token-driven, RTL-first Arabic, accessible, responsive,
with all required states — and the §28 Design QA checklist passes.