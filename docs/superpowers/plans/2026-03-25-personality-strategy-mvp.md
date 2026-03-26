# Personality Strategy MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight pet personality and strategy system to the current MVP so pets feel distinct, strategy becomes more playable, and OpenClaw users can manage pet behavior without expanding the command surface.

**Architecture:** Keep the current five-command MVP intact and add a thin strategy layer on top: pet persona profile + dynamic state (`loyalty`, `resentment`, `ambition`, `heat`) + player-selected strategy mode + bounded autonomy. Backend remains the source of truth, OpenClaw surfaces the new state and controls, and docs are updated so internal testers understand the new loop.

**Tech Stack:** Node.js, TypeScript, lightweight HTTP server in `apps/server`, OpenClaw client/skill packages, existing file-backed state model, pnpm monorepo.

---

## Chunk 1: Backend Personality and Strategy State

### Task 1: Extend the backend data model

**Files:**
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server/src/store.ts`
- Test: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server/src/store.test.ts`

- [ ] Add new pet-level types for:
  - `PersonaProfile`
  - `StrategyMode`
  - `AutonomyLevel`
  - `TargetPreference`
  - `RecentOutcome`
- [ ] Extend `Pet` with:
  - `personaProfile`
  - `loyalty`
  - `resentment`
  - `ambition`
  - `heat`
  - `strategyMode`
  - `autonomyLevel`
  - `targetPreference`
  - `recentOutcomes`
- [ ] Initialize starter pets with a default profile and default values.
- [ ] Persist and reload the new fields through the existing file-backed state.
- [ ] Add or update tests proving:
  - starter pets get default personality fields
  - persisted state reloads them correctly

### Task 2: Make commands and economy mutate personality state

**Files:**
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server/src/store.ts`
- Test: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server/src/store.test.ts`

- [ ] Replace the current fixed command-only result model with:
  - base command profit
  - personality modifier
  - strategy modifier
  - updated `heat`
- [ ] Implement simple deterministic rules:
  - high loyalty improves `earn` and `stay_low`
  - high resentment improves `taunt` and `revenge`
  - high ambition increases volatility or upside for `earn` and `revenge`
- [ ] Update state after important economy actions:
  - `withdrawProfit` lowers loyalty and increases resentment
  - `reinvestProfit` increases loyalty slightly and may increase ambition
  - duel resolution affects ambition/resentment depending on result
  - successful bounty/service actions add small ambition or loyalty changes
- [ ] Emit state/personality deltas into event/feed details.
- [ ] Add tests for:
  - same command producing different result across two different pet profiles
  - withdraw/reinvest changing personality stats
  - duel resolution changing personality stats

### Task 3: Add strategy/autonomy/personality endpoints

**Files:**
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server/src/router.ts`
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server/src/store.ts`
- Test: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server/src/router.test.ts`
- Test: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server/src/store.test.ts`

- [ ] Add backend methods for:
  - `getPetPersonality`
  - `setPetStrategy`
  - `setPetAutonomy`
  - `getPetRecommendations`
- [ ] Add HTTP routes:
  - `GET /api/pets/:id/personality`
  - `PATCH /api/pets/:id/strategy`
  - `PATCH /api/pets/:id/autonomy`
  - `GET /api/pets/:id/recommendations`
- [ ] Include strategy/personality snapshots in:
  - `GET /api/me/home`
  - `GET /api/me/pets`
- [ ] Keep route naming and auth behavior consistent with the existing server.
- [ ] Add tests for route auth, payload validation, and snapshot shape.

## Chunk 2: OpenClaw Client and Skill Integration

### Task 4: Extend shared client types and calls

**Files:**
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-client/src/client.ts`
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-client/src/index.ts`
- Test: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-client/src/client.test.ts`

- [ ] Add typed snapshots for:
  - pet personality
  - strategy summary
  - autonomy summary
  - recommended actions
- [ ] Add client methods:
  - `getPetPersonality`
  - `setPetStrategy`
  - `setPetAutonomy`
  - `getPetRecommendations`
- [ ] Extend `HomeSnapshot` typing to surface the new backend fields.
- [ ] Add tests for request paths and response mapping.

### Task 5: Add OpenClaw skill operations

**Files:**
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill/src/skill.ts`
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill/src/index.ts`
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill/src/command-presets.ts`
- Test: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill/src/skill.test.ts`

- [ ] Expose new skill methods:
  - `personality`
  - `setStrategy`
  - `setAutonomy`
  - `recommendations`
- [ ] Extend the `execute(...)` union with operations for:
  - `get_personality`
  - `set_strategy`
  - `set_autonomy`
  - `get_recommendations`
- [ ] Add user-facing strategy labels in Chinese:
  - `稳健赚钱`
  - `高热度挑事`
  - `关系经营`
  - `定向复仇`
  - `保本低调`
- [ ] Keep canonical command handling stable; do not add more commands.
- [ ] Add tests for the new execute operations and strategy mapping.

## Chunk 3: Product Surface and Internal Handoff

### Task 6: Refresh user journey and social surface docs

**Files:**
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/docs/internal-handoff.md`
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/docs/mvp-launch-checklist.md`
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/docs/openclaw-user-command-guide.md`
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/docs/mvp-social-surface.md`
- Modify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/docs/canned-economy-model.md`

- [ ] Update docs to reflect:
  - current user journey in Chinese
  - OpenClaw-only claim flow
  - website as display-only MVP surface
  - strategy/personality as a first-class gameplay layer
- [ ] Add a short section explaining:
  - what players configure
  - what pets can do autonomously
  - what still requires explicit player confirmation
- [ ] Keep X clearly marked as lowest priority and not part of MVP primary loop.

### Task 7: Add frontend planning brief only

**Files:**
- Create: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/docs/frontend-companion-plan.md`

- [ ] Write a short planning brief for the future website:
  - `首页`
  - `广场`
  - `宠物页`
  - `玩家页`
  - `机会板`
- [ ] Explicitly state that:
  - website is not the command surface
  - claim does not belong on the website
  - OpenClaw remains the place for active operations

## Chunk 4: Integration and Verification

### Task 8: Verify full personality/strategy MVP loop

**Files:**
- Verify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server`
- Verify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-client`
- Verify: `C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill`

- [ ] Run:
  - `corepack pnpm --dir "C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server" test`
  - `corepack pnpm --dir "C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/apps/server" build`
  - `corepack pnpm --dir "C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-client" test`
  - `corepack pnpm --dir "C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-client" build`
  - `corepack pnpm --dir "C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill" test`
  - `corepack pnpm --dir "C:/Users/shine/Desktop/agent game/.worktrees/codex-initial/packages/openclaw-skill" build`
  - `corepack pnpm --dir "C:/Users/shine/Desktop/agent game/.worktrees/codex-initial" mvp:playtest:economy`
- [ ] Confirm the final product loop:
  - user can see pet personality
  - user can set strategy/autonomy
  - command outcomes differ by pet personality/strategy
  - economy actions feed back into pet state
  - home/recommendations show the new strategy layer
