# ORMS OpenCode — Official Resource References

Curated, authoritative references for ORMS Media Studio development. Use official
documentation **first** before inventing approaches. This file is reference-only; it
does not grant permission to copy third-party code into the repository.

---

## OpenCode (the agent runtime used by ORMS)

- https://opencode.ai/docs/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/rules/
- https://opencode.ai/docs/permissions/
- https://opencode.ai/docs/config/
- https://opencode.ai/docs/providers/

## Agent Skills (general engineering skills)

- https://github.com/addyosmani/agent-skills
- https://github.com/addyosmani/agent-skills/blob/main/docs/opencode-setup.md
- https://github.com/vercel-labs/skills

## UI and design — third-party (license-sensitive)

- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

> **License status (verified 2026-07-23):** The upstream repository's `LICENSE` file
> currently declares the **MIT License**. The project README also states MIT. The setup
> brief expected `CC-BY-NC-4.0`, which **no longer matches** the repository.
>
> Even though it is MIT (commercial-compatible), the ORMS setup **did not auto-install /
> commit the third-party skill bundle** because no explicit install authorization was
> given and the brief prefers a custom, repo-native `orms-ui-design-system` skill
> grounded in `DESIGN.md`. If the user later confirms they want it installed, run
> `npx ui-ux-pro-max-cli init --ai opencode` and re-check the license at that time.
> Do **not** copy third-party branding or generic AI-dashboard styling into ORMS.

## Current project stack

- https://nextjs.org/docs
- https://www.prisma.io/docs
- https://www.postgresql.org/docs/
- https://docs.bullmq.io/
- https://developers.cloudflare.com/r2/
- https://developers.cloudflare.com/r2/api/s3/api/
- https://openrouter.ai/docs
- https://next-intl.dev/docs
- https://vitest.dev/guide/
- https://playwright.dev/docs/intro
- https://docs.github.com/actions
- https://cheatsheetseries.owasp.org/

## Future source references (Increment 2+ — reference only, do not integrate now)

- https://github.com/Anil-matcha/Open-Generative-AI
- https://github.com/Anil-matcha/Open-Generative-AI/tree/main/packages/studio
- https://github.com/SamurAIGPT/Vibe-Workflow
- https://github.com/comfyanonymous/ComfyUI

> These are inspect-only references during the current setup. Do **not** clone, copy,
> or integrate their application code into ORMS in Increment 1. Any future porting must
> re-verify each upstream commit hash and license and avoid copying third-party branding.