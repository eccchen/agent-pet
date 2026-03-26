# Frontend Companion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first website slice as a read-only companion for the current MVP, with a public-facing home and plaza plus the backend read surfaces needed to support them.

**Architecture:** Keep OpenClaw as the only action surface. The website should consume read-only backend data and present a public world view. Implement the first slice in two parallel tracks: add safe public read endpoints in the backend, then rebuild the web app around a plaza-first presentation layer that never performs claim, command, or wallet actions.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, existing Node/TypeScript backend routes.

---

## Chunk 1: Public Read Surfaces

### Task 1: Add public world summary and plaza routes

**Files:**
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\store.ts`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\router.ts`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\router.test.ts`

- [ ] **Step 1: Write the failing route tests**

Add tests for:
- `GET /api/public/world-summary`
- `GET /api/public/plaza`

Expected shape:
- `world-summary`: global counters and highlights suitable for homepage hero/support modules
- `plaza`: current global plaza summary without requiring a session

- [ ] **Step 2: Run the targeted tests to verify failure**

Run:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server" test
```

Expected: new route tests fail because endpoints do not exist yet.

- [ ] **Step 3: Implement minimal store helpers**

Add read-only helpers that expose:
- world-level counts from existing economy/plaza state
- current highlighted plaza content

Do not add write behavior.

- [ ] **Step 4: Implement the public routes**

Add session-free routes in `router.ts`:
- `GET /api/public/world-summary`
- `GET /api/public/plaza`

The response must not include secrets, session data, or write affordances.

- [ ] **Step 5: Run the server test suite**

Run:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server" test
```

Expected: pass.

### Task 2: Add public pet and player detail routes

**Files:**
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\store.ts`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\router.ts`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server\src\router.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for:
- `GET /api/public/pets/:petId`
- `GET /api/public/players/:walletAddress`

The pet route should return a read-only public profile.
The player route should return a read-only public summary.

- [ ] **Step 2: Implement minimal store selectors**

Expose read-safe selectors for:
- public pet profile
- public player summary

Include personality/strategy summary where available.

- [ ] **Step 3: Implement routes**

Do not require auth.
Do not leak session-only state.

- [ ] **Step 4: Run tests**

Run:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server" test
```

Expected: pass.

## Chunk 2: Web Data Layer

### Task 3: Expand the web API client for public website reads

**Files:**
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\lib\api.ts`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\lib\api.test.ts`

- [ ] **Step 1: Write failing client tests**

Add tests for:
- `getPublicWorldSummary`
- `getPublicPlaza`
- `getPublicPet`
- `getPublicPlayer`

- [ ] **Step 2: Implement minimal client methods**

Add typed methods for the new public endpoints only.

- [ ] **Step 3: Run web tests**

Run:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web" test
```

Expected: pass.

## Chunk 3: Website Shell

### Task 4: Replace the current home shell with a companion-site shell

**Files:**
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\app\page.tsx`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\app\layout.tsx`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\app\globals.css`
- Create: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\app\plaza\page.tsx`
- Create: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\app\opportunities\page.tsx`
- Create: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\app\pets\[petId]\page.tsx`
- Create: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\app\players\[walletAddress]\page.tsx`
- Create: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web\lib\companion-data.ts`

- [ ] **Step 1: Remove the bootstrap-centric homepage copy**

The current page is centered on auth/bootstrap tooling. Replace it with a public companion-site home.

- [ ] **Step 2: Build the shared shell**

Implement:
- top navigation
- calm but dramatic background treatment
- consistent section spacing
- “OpenClaw 中操作，网站里看结果” messaging

- [ ] **Step 3: Build the homepage**

Use:
- world summary
- plaza highlights
- clear CTA to OpenClaw

- [ ] **Step 4: Build the plaza page**

Use public plaza data and display:
- headline
- highlights
- active wallets/targets
- spotlight cards

- [ ] **Step 5: Build the opportunity board**

Start with available public data. If true public opportunities are not yet exposed, use the best current summary plus clear “在 OpenClaw 中执行” framing.

- [ ] **Step 6: Build pet and player detail pages**

Render read-only profiles only.
No action buttons beyond navigation.

- [ ] **Step 7: Run build and tests**

Run:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web" test
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web" build
```

Expected: pass.

## Chunk 4: Docs and Handoff

### Task 5: Align docs with the implemented website slice

**Files:**
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\frontend-companion-plan.md`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\README.md`
- Modify: `C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\internal-handoff.md`

- [ ] **Step 1: Document the implemented page set**

Update docs to reflect what is actually shipped in the first website slice.

- [ ] **Step 2: Document the website boundary clearly**

Repeat explicitly:
- no website claim
- no website commands
- no website wallet confirmation

- [ ] **Step 3: Re-run builds/tests**

Run:

```powershell
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\server" test
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web" test
corepack pnpm --dir "C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\apps\web" build
```

Expected: pass.
