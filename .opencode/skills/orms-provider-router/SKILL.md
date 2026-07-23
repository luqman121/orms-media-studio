---
name: orms-provider-router
description: Load when implementing or reviewing model metadata, capability derivation, cost estimation, provider error normalization, timeouts/retryability, or any new provider adapter in packages/model-router or packages/openrouter. Enforces that OpenRouter stays behind packages/model-router, provider secrets remain server-side, server-side capability validation + cost estimation, normalized Arabic errors, and future-provider extensibility without UI rewrites.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-provider-router

## When to use
When working inside `packages/model-router` or `packages/openrouter`, adding model metadata,
capability/cost logic, error normalization, timeouts/retry for provider calls, or designing the
adapter seam for future providers.

## Files to inspect first
- `packages/model-router/src/types.ts` (`MediaCapability`, `MediaType`, `ModelLimits`,
  `ModelPricing`, `ModelDefinition`, `NormalizedError`)
- `packages/model-router/src/openrouter.ts` (OpenRouter adapter: capability derivation,
  `listImageModelDefinitions`, `listVideoModelDefinitions`, `normalizeError`)
- `packages/model-router/src/credits.ts` (`usdToCredits`, `estimateCredits`, `pricingUnit`,
  `SIGNUP_CREDITS`, `CREDITS_PER_USD`)
- `packages/model-router/src/index.ts` (`listModelDefinitions`, `findModelDefinition`)
- `packages/model-router/tsconfig.json` (`module: ESNext`, `moduleResolution: Bundler`,
  **extensionless** relative imports — required for Next webpack; do not revert to NodeNext `.js`)
- `packages/openrouter/src/index.ts`
- `IMPLEMENTATION_PLAN.md` §12 (provider-router requirements)

## Required workflow
1. Keep all provider access behind `packages/model-router`; the web/worker import model metadata
   and call OpenRouter only through this seam (+ `packages/openrouter`).
2. Use the typed `ModelDefinition` for internal metadata; **server-side** capability validation
   and **server-side** credit estimation (never trust the client).
3. Normalize every provider error via `normalizeError` → `NormalizedError` (stable `code`,
   `detail` for logs only, Arabic `messageAr` safe to show, `retryable` boolean).
4. Add timeouts and retryability classification on provider calls.
5. Future adapters (MuAPI/Fal/Replicate/WaveSpeed/ComfyUI) must slot into the same
   `ModelDefinition`/adapter shape **without** changing the UI. Multi-provider is **not** part of
   Increment 1 — OpenRouter only.

## Invariants
- **No provider secrets in the browser** — `OPENROUTER_API_KEY` stays server-side.
- Capability/cost decisions are server-authoritative.
- Errors normalized to user-safe Arabic + machine `code` + `retryable`.
- The `module: ESNext` + extensionless-import config in `tsconfig.json` is preserved.
- Increment 1 ships exactly one provider (OpenRouter).

## Prohibited shortcuts
- Calling OpenRouter from the browser.
- Letting the client decide capabilities or estimate cost.
- Designing broker without adapters, without the typed `ModelDefinition`, or with UI coupled to a provider.
- Changing `tsconfig.json` back to NodeNext with `.js` extensions.

## Verification commands
```bash
npm --workspace @orms/model-router run typecheck
npm run build
grep -rn "OPENROUTER_API_KEY" apps/web/app  apps/web/components 2>/dev/null  # must be empty
```

## Evidence required before claiming completion
- Typecheck + build pass for `@orms/model-router`.
- Error normalization covered for the provider error shapes (mocked).
- No provider key reference in any client-shipped code.

## Definition of done
OpenRouter is fully behind `packages/model-router` with typed metadata, server-side capability
validation + cost estimation, normalized Arabic errors + retryability, timeouts, and a provider-
agnostic seam — multi-provider stays deferred to Increment 2.