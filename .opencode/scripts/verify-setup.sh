#!/usr/bin/env bash
# ORMS Media Studio — OpenCode setup verification (read-only, non-destructive).
# Checks branch, commits, files, config, skills, agents, env, deps, services, Prisma, git status.
# Does NOT start services, install packages, migrate, push, or modify files.
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 1

PASS=0; WARN=0; FAIL=0
ok(){ printf '  \033[32mOK\033[0m   %s\n' "$1"; PASS=$((PASS+1)); }
warn(){ printf '  \033[33mWARN\033[0m %s\n' "$1"; WARN=$((WARN+1)); }
fail(){ printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAIL=$((FAIL+1)); }
hdr(){ printf '\n== %s ==\n' "$1"; }

hdr "Branch & commits"
B="$(git branch --show-current 2>/dev/null)"
if [ "$B" = "feat/complete-generative-studio" ]; then ok "branch=$B"; else fail "branch=$B (expected feat/complete-generative-studio)"; fi
if git log --oneline | grep -q 'f3139cd'; then ok "commit f3139cd (Phase 1) present"; else fail "f3139cd missing"; fi
if git log --oneline | grep -q '36ec947'; then ok "commit 36ec947 (Phase 2a) present"; else fail "36ec947 missing"; fi

hdr "Required docs"
[ -f IMPLEMENTATION_PLAN.md ] && ok "IMPLEMENTATION_PLAN.md" || fail "IMPLEMENTATION_PLAN.md missing"
[ -f AGENTS.md ] && ok "AGENTS.md" || fail "AGENTS.md missing"
[ -f DESIGN.md ] && ok "DESIGN.md" || fail "DESIGN.md missing"
[ -f .opencode/references/official-resources.md ] && ok "official-resources.md" || fail "official-resources.md missing"

hdr "opencode.json"
if command -v python3 >/dev/null && python3 -c 'import json,sys;sys.exit(0 if json.load(open("opencode.json")) else 1)' 2>/dev/null; then
  ok "valid JSON"
else fail "invalid opencode.json"; fi
grep -q '"skill"' opencode.json && ok "skill permission present" || warn "no skill permission key"
grep -q '"bash"' opencode.json && ok "bash permission present" || warn "no bash permission key"
grep -q 'migrate reset' opencode.json && ok "migrate reset denied" || warn "no migrate-reset deny rule"

hdr "ORMS skills (10 required)"
for s in orms-architecture orms-generation-lifecycle orms-credit-ledger orms-asset-security \
         orms-arabic-rtl orms-ui-design-system orms-testing-ci orms-database-migrations \
         orms-provider-router orms-git-delivery; do
  f=".opencode/skills/$s/SKILL.md"
  [ -f "$f" ] && ok "$s" || fail "$s missing"
done

hdr "General engineering skills (14 required)"
miss=0; g=0
for s in incremental-implementation test-driven-development api-and-interface-design \
         debugging-and-error-recovery security-and-hardening code-review-and-quality \
         frontend-ui-engineering performance-optimization ci-cd-and-automation \
         observability-and-instrumentation git-workflow-and-versioning source-driven-development \
         deprecation-and-migration documentation-and-adrs; do
  if [ -f ".opencode/skills/$s/SKILL.md" ]; then g=$((g+1)); else fail "$s missing"; miss=$((miss+1)); fi
done
[ "$miss" = 0 ] && ok "all 14 present"

hdr "Skill frontmatter + name/dir match"
python3 - <<'PY' 2>/dev/null && ok "frontmatter valid" || fail "frontmatter validation error"
import re,glob,os,sys
bad=0
for p in sorted(glob.glob('.opencode/skills/*/SKILL.md')):
    t=open(p,encoding='utf-8').read()
    m=re.match(r'^---\n(.*?)\n---\n',t,re.S)
    if not m: print('  bad fm',p); bad+=1; continue
    fm=m.group(1); d={}
    for l in [x for x in fm.splitlines() if x.strip() and not x[0].isspace()]:
        if ':' in l:
            k,v=l.split(':',1); d[k.strip()]=v.strip()
    dirn=os.path.basename(os.path.dirname(p)); name=d.get('name','')
    if not name: print('  no name',p); bad+=1
    elif not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$',name): print('  bad name',p,name); bad+=1
    elif name!=dirn: print('  mismatch',p,name,dirn); bad+=1
    if not d.get('description'): print('  no desc',p); bad+=1
    elif not (1<=len(d['description'])<=1024): print('  desc len',p,len(d['description'])); bad+=1
sys.exit(1 if bad else 0)
PY

hdr "Agents (8 required)"
for a in orms-orchestrator orms-explorer orms-backend orms-frontend orms-security \
         orms-tests orms-reviewer orms-research; do
  f=".opencode/agents/$a.md"
  [ -f "$f" ] && ok "$a" || fail "$a missing"
done

hdr "Agent frontmatter"
python3 - <<'PY' 2>/dev/null && ok "agents frontmatter valid" || fail "agent frontmatter error"
import re,glob,os,sys
bad=0
for p in sorted(glob.glob('.opencode/agents/*.md')):
    t=open(p,encoding='utf-8').read()
    m=re.match(r'^---\n(.*?)\n---\n',t,re.S)
    if not m: print('  no fm',p); bad+=1; continue
    d={}
    for l in [x for x in m.group(1).splitlines() if x.strip() and not x[0].isspace()]:
        if ':' in l:
            k,v=l.split(':',1); d[k.strip()]=v.strip()
    if not d.get('description'): print('  no desc',p); bad+=1
    if d.get('mode') not in ('primary','subagent','all'): print('  bad mode',p,d.get('mode')); bad+=1
    # read-only agents must deny edit
    if d.get('mode')=='subagent' and any(x in os.path.basename(p) for x in ('explorer','security','reviewer','research')):
        perm=m.group(1)
        if re.search(r'edit:\s*allow',perm): print('  read-only agent allows edit',p); bad+=1
sys.exit(1 if bad else 0)
PY

hdr "Orchestrator task perms deny broad, allow orms-*"
grep -Eq '"orms-\*":\s*allow' .opencode/agents/orms-orchestrator.md 2>/dev/null && ok "orms-* allowed" || warn "check orchestrator orms-* rule"
grep -Eq '"\*":\s*deny' .opencode/agents/orms-orchestrator.md 2>/dev/null && ok "broad task denied" || warn "check orchestrator deny-all rule"
grep -Eq '"explore":\s*allow' .opencode/agents/orms-orchestrator.md 2>/dev/null && ok "explore allowed (read-only)" || warn "explore not allowed"

hdr "Node / npm / python"
command -v node >/dev/null && ok "node $(node --version)" || fail "node missing"
command -v npm >/dev/null && ok "npm $(npm --version)" || fail "npm missing"
command -v python3 >/dev/null && ok "python3 $(python3 --version)" || warn "python3 missing"

hdr "Dependencies"
if [ -d node_modules ] && [ -d node_modules/@prisma/client ] && [ -d node_modules/next ]; then
  ok "node_modules present (installed)"
else warn "node_modules incomplete (run npm ci)"; fi

hdr "Docker & services"
if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
  ok "docker daemon running"
  if command -v docker >/dev/null; then
    if docker ps --format '{{.Names}}' | grep -q orms-db; then ok "orms-db container up"; else warn "orms-db not running (start: docker compose up -d db)"; fi
    if docker ps --format '{{.Names}}' | grep -q orms-redis; then ok "orms-redis container up"; else warn "orms-redis not running (start: docker compose up -d redis)"; fi
  fi
else warn "docker not running (start: sudo systemctl start docker)"; fi

hdr "Prisma readiness (validate/generate already ran; re-checking)"
if DATABASE_URL=postgresql://x:x@localhost:5432/x npx prisma validate --schema=packages/db/prisma/schema.prisma >/dev/null 2>&1; then
  ok "prisma validate"
else fail "prisma validate (needs DATABASE_URL env)"; fi
[ -d node_modules/.prisma/client ] || [ -d packages/db/generated ] || ls node_modules/@prisma/client >/dev/null 2>&1 && ok "prisma client generated" || warn "prisma client not confirmed"

hdr "Git status cleanliness (setup commit may be uncommitted)"
if [ -z "$(git status --short 2>/dev/null)" ]; then ok "working tree clean"; else warn "uncommitted changes: $(git status --short | wc -l) path(s)"; fi

printf '\n================================\n'
printf 'PASS=%d  WARN=%d  FAIL=%d\n' "$PASS" "$WARN" "$FAIL"
if [ "$FAIL" = 0 ]; then printf '\033[32mSETUP VERIFIED (warnings are external/pre-existing blockers)\033[0m\n'; else printf '\033[31mSETUP HAS FAILURES — see above\033[0m\n'; fi
exit $([ "$FAIL" = 0 ] && echo 0 || echo 1)