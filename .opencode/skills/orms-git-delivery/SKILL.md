---
name: orms-git-delivery
description: Load before any commit, branch, push, or merge decision for ORMS Media Studio. Enforces that work happens only on feat/complete-generative-studio with meaningful phase commits, push feature branch only (never main), never merge to main, never deploy, and that implementation status is updated in IMPLEMENTATION_PLAN.md only after verification.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-git-delivery

## When to use
Before staging, committing, pushing, rebasing, or merging anything in the ORMS repo.

## Files to inspect first
- `IMPLEMENTATION_PLAN.md` §18 (agent execution rules), §6 (completed commits), §9 (phases)
- `git status`, `git diff`, `git log --oneline -10`

## Required workflow
1. Confirm the branch: `git branch --show-current` → must be `feat/complete-generative-studio`.
2. Confirm required commits present: `f3139cd` (Phase 1) and `36ec947` (Phase 2a).
3. Stage only intended files; never stage `.env`, `.env.local`, credentials, `node_modules`, DB dumps.
4. Commit in **meaningful phases** with a clear message matching repo style.
5. Push the **feature branch only** (`git push origin feat/complete-generative-studio`) — and **only**
   if the user has explicitly authorized pushing.
6. Update `IMPLEMENTATION_PLAN.md` checkboxes + commit hashes **only after** verified completion.
7. Keep `git status` clean, or explicitly explain any uncommitted state.

## Invariants
- Work only on `feat/complete-generative-studio`.
- Commit messages describe a phase/step (e.g. `Phase 2b: durable generation lifecycle`).
- The implementation plan is updated **after** verification, with real commit hashes.
- Pushing requires explicit user authorization; never push to `main`.

## Prohibited shortcuts
- Committing or pushing to `main`.
- Pushing the feature branch without explicit authorization.
- Rebasing/resetting/force-pushing without explicit authorization.
- Amending a pushed commit (create a new commit instead if a pushed commit failed).
- Deploying, or faking verified runtime behavior.
- Updating plan checkboxes without executing the verification.

## Verification commands
```bash
git branch --show-current
git log --oneline -5       # confirm f3139cd, 36ec947 present
git status --short
git diff --staged --stat
```

## Evidence required before claiming completion
- The active branch name.
- The commit hash(es) created or pushed.
- Whether a push occurred (and only to the feature branch, only if authorized).

## Definition of done
Work is committed on `feat/complete-generative-studio` in a meaningful phase, `main` is untouched,
no deployment occurred, secrets are unstaged, and the plan's status reflects only verified work.