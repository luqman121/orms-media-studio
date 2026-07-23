# Third-Party Notices

ORMS Media Studio incorporates and/or draws on the third-party work listed below.
Each entry records the source, license, what was reused, and any modifications.

---

## Open-Generative-AI

- **Source:** https://github.com/Anil-matcha/Open-Generative-AI
- **Package of interest:** `packages/studio` (shared React studio component library)
- **License:** MIT License (a `LICENSE` file is present in the upstream repository).
- **Stack:** Next.js 14 / React 18 / Tailwind, JavaScript, wired to the Muapi.ai API,
  with an Electron desktop shell.

### Reuse status in this repository

As of **Increment 1** (this branch), **no source code has been copied or ported** from
Open-Generative-AI into ORMS. ORMS currently generates media exclusively through
**OpenRouter**, whereas the upstream studios are wired to **Muapi.ai**. Porting those
components now would produce UI that is not connected to a working backend, which the
project rules explicitly prohibit ("no fake buttons / no dead tabs"). Their UX patterns
were reviewed for reference only.

**Planned reuse (deferred to the multi-provider phase):** when a Muapi (or equivalent)
provider adapter is added behind a feature flag, the relevant studio components
(e.g. `ImageStudio`, `VideoStudio`, `LipSyncStudio`) will be **ported and refactored**
into an ORMS package, converted to strict TypeScript, and re-skinned to ORMS design
tokens and internal API routes. At that time this file will be updated with:

- the exact upstream commit hash used,
- the specific files/components reused,
- the ORMS files that adapt them,
- the MIT copyright and permission notice reproduced verbatim.

### MIT permission notice

The MIT license requires that the copyright and permission notice be preserved in
copies or substantial portions of the software. Because no substantial portion has yet
been copied, the upstream notice is referenced here and will be reproduced in full
alongside any ported code once reuse occurs.

---

_Last updated: Increment 1 (feat/complete-generative-studio)._
