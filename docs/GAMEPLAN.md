# Development Gameplan: Build It Yourself

This guide is for learning by doing. No AI assistance—just you, the docs, and your brain.

---

## Architecture Conventions

```
src/lib/
  core/           # Shared utilities (errors, IDs)
  domain/         # Rules + state transitions (NO PocketBase imports)
  data/           # PocketBase mapping + repositories (CRUD)
  usecases/       # Orchestration ("do the thing") calling domain + repos
  components/     # UI components (thin) calling usecases
  stores/         # Svelte stores (thin) calling usecases
```

| Layer | Responsibility | Imports |
|-------|----------------|---------|
| **Domain** | Business rules, state machines, validation logic | Only core utilities, Zod schemas |
| **Data** | PocketBase CRUD, DTO mapping | PocketBase SDK, Zod schemas |
| **Usecases** | Orchestrate domain + repos, enforce workflows | Domain classes, repositories |
| **UI** | Render state, capture input, call usecases | Usecases, stores, components |

**Key rule:** Domain never imports PocketBase. If you need persistence, it goes through a usecase that calls a repository.

---

## Phase 1 — Project Scaffolding

### Outcomes
- Clean folder structure
- Shared utilities in place

### Steps
- [ ] Add `src/lib/core/errors.ts` (simple error types)
- [ ] Add `src/lib/core/ids.ts` (helper for ID formatting if needed)
- [ ] Add `src/lib/data/pb/pb.client.ts` (single PocketBase client factory)

---

## Phase 2 — Define Your Core Aggregates

### Outcomes
- Clear ownership boundaries
- Manageable feature list

### Competition Context (Real League)

**Aggregate roots** (own their children, control consistency)
- `Season`
- `Tournament` (owns rounds + groups + scoring state)
- `Course` (owns holes)

**Entities** (have identity, belong to an aggregate)
- `Team` (ALWAYS exactly 1 male pro + 1 female pro)
- `Pro`
- `Group` (pairings) under a tournament round

**Value objects** (no identity, immutable)
- `HoleScoreEvent` (hole-by-hole entries)

### Fantasy Context

**Aggregate roots**
- `FantasySeason`
- `FantasyLeague` (owns participants + draft + rosters)

**Entities**
- `Draft`, `DraftPick`, `FantasyRoster`, `FantasyParticipant`

**Policies** (encapsulated rules)
- `SnakeDraftOrder`
- `DraftRules` (round 1–2 no filter; rounds 3–4 filter by roster composition)
- `RecommendationEngine` + `AutoPickPolicy`

### Steps
- [ ] Write ownership notes in `/docs/domain.md`:
  - Tournament owns groups & scoring rules
  - FantasyLeague owns draft rules & roster composition
  - Course edits do not rewrite past tournaments (snapshot reference)

---

## Phase 3 — Zod Schemas for Data Contracts

### Outcomes
- Every object has a validated shape
- Repositories always return validated DTOs

### Steps (create `*.schema.ts` for each)
- [ ] `Season`
- [ ] `Tournament`
- [ ] `Course`
- [ ] `Hole`
- [ ] `Pro` (includes `gender: "male" | "female"`)
- [ ] `Team` (male_pro_id, female_pro_id)
- [ ] `TournamentRound`, `Group`, `HoleScoreEvent`
- [ ] `FantasySeason`, `FantasyLeague`, `FantasyParticipant`
- [ ] `DraftSettings`, `Draft`, `DraftPick`, `FantasyRoster`

### Invariants
- Team must have 1 male + 1 female (validate via lookup in usecase, not schema-only)
- Draft composition rules enforced by `DraftRules` policy (not in UI)

---

## Phase 4 — Domain Classes (Behavior Lives Here)

### Outcomes
- Logic centralized, not scattered across UI
- Unit testable without PocketBase

### Tournament Domain Class

```typescript
class Tournament {
  // State: scheduled -> live -> final
  
  createRound(roundNo: number): TournamentRound
  addGroup(roundNo: number, group: Group): void
  submitHoleScore(event: HoleScoreEvent): void
  finalizeRound(roundNo: number): void
  finalizeTournament(): void
}
```

### FantasyLeague Domain Class

```typescript
class FantasyLeague {
  // State: not_started -> in_progress -> locked
  
  startDraft(settings: DraftSettings): Draft
  getDraftOptions(participantId: string, roundNo: number, availablePros: Pro[]): DraftOptions
  makePick(participantId: string, proId: string): DraftPick
  autoPickIfExpired(now: Date): DraftPick | null
  lockDraft(): void
}
```

### Steps
- [ ] Implement state machines with statuses
- [ ] Domain methods enforce status checks (no scoring if tournament not live)
- [ ] Throw domain errors for invalid transitions

---

## Phase 5 — Repositories (PocketBase CRUD + Mapping)

### Outcomes
- PocketBase is a replaceable detail
- App works with DTOs/domain objects

### Repos to Create

**Competition:**
- `SeasonRepo`, `TournamentRepo`, `CourseRepo`, `HoleRepo`
- `ProRepo`, `TeamRepo`
- `RoundRepo`, `GroupRepo`, `ScoreEventRepo`

**Fantasy:**
- `FantasySeasonRepo`, `FantasyLeagueRepo`, `ParticipantRepo`
- `DraftRepo`, `PickRepo`, `RosterRepo`

### Steps
- [ ] Every repo method returns Zod-validated DTOs (`Schema.parse(record)`)
- [ ] Create thin mapping layer if PB field names differ
- [ ] Keep relations as IDs in DTOs (avoid nested object trees)

---

## Phase 6 — Use Cases (The "App Actions" Layer)

### Outcomes
- UI calls one function per action
- Rules, persistence, validation centralized

### Competition Use Cases
- [ ] `CreateSeason`
- [ ] `CreateTournament`
- [ ] `CreateCourseAndHoles`
- [ ] `CreateTeamsFromPros`
- [ ] `CreateGroupsForRound` (pairings)
- [ ] `AssignScorekeeperToGroup`
- [ ] `SubmitHoleScore` (writes event; updates derived totals)
- [ ] `FinalizeRound`
- [ ] `FinalizeTournament`

### Fantasy Use Cases
- [ ] `CreateFantasySeason`
- [ ] `CreateFantasyLeague`
- [ ] `StartSnakeDraft`
- [ ] `GetDraftOptions` (FILTER + RECOMMEND)
- [ ] `MakeDraftPick`
- [ ] `AutoPickOnTimeout` (uses recommendation)
- [ ] `LockDraft`

---

## Phase 7 — Pairings & Live Scoring

### Outcomes
- Hole-by-hole scoring organized by group
- Clear scorekeeper workflow

### Core Design

A `Group` belongs to a `TournamentRound`.

A `HoleScoreEvent` includes:
- tournament_id, round_no, group_id
- pro_id, hole_no, throws
- entered_by_user_id, entered_at

Derived views (optional):
- Scorecards per pro/per round (computed from events)

### Steps
- [ ] Create group management UI calling usecases
- [ ] Create scorekeeper UI that loads:
  - current group
  - current hole
  - roster of pros in group
- [ ] Write scores as events (append-only)
- [ ] Add validation:
  - hole_no exists
  - throws within reasonable bounds
  - scorekeeper assigned to group

---

## Phase 8 — Fantasy Draft Engine

### Outcomes
- Draft is deterministic and consistent
- UI stays dumb: renders options + recommendation from usecase

### Snake Draft Policy

```
Round 1: 1 → N
Round 2: N → 1
Round 3: 1 → N
Round 4: N → 1
...repeat
```

### Filtering Rules

Draft pool: 12 male + 12 female pros

| Round | Filter |
|-------|--------|
| 1–2 | Show all available pros |
| 3–4 | If roster has 2 males → only show females |
|     | If roster has 2 females → only show males |
|     | Else show all available |

### Recommendation Engine

Return 1 recommended pro from filtered list:
- Start simple: highest rating or projected points
- Add tie-breakers later (avoid repeats, rank tiers)

### AutoPick

If timer expires:
1. Call `AutoPickOnTimeout`
2. Uses same recommendation logic
3. Records pick event
4. Advances clock

### Steps
- [ ] Build `GetDraftOptions` usecase:
  - loads participant roster + available pros
  - computes allowed list
  - computes recommendation
  - returns both
- [ ] Build `MakeDraftPick` usecase:
  - validates correct participant on clock
  - validates pro is available + allowed
  - writes pick
  - advances to next pick
- [ ] Build `AutoPickOnTimeout` usecase:
  - checks expiration
  - uses recommendation
  - writes pick
  - advances

---

## Phase 9 — Integrate Into Working UI (Gradual Swap)

### Outcomes
- Keep working client alive while refactoring
- Replace features one at a time

### Strategy

Keep existing screens. Swap data calls to usecases gradually:
1. Scoring screen → `SubmitHoleScore`
2. Draft screen → `GetDraftOptions` + `MakeDraftPick` + `AutoPickOnTimeout`
3. Admin screens → create/update via repos/usecases

### Steps
- [ ] Start with read-only lists (lowest risk)
- [ ] Then scoring submission (medium)
- [ ] Then draft flow (highest impact)

---

## Phase 10 — Add Auth / Roles

### Outcomes
- Roles applied to clean usecases
- No auth assumptions baked into components

### Roles

| Role | Access |
|------|--------|
| admin | Everything |
| leader | Their departments |
| vendor | Their department |
| pro | Their own info |
| scorekeeper | Score assigned groups |

### Steps
- [ ] Add auth to PB (users collection)
- [ ] Add role fields + access checks at usecase layer:
  - `SubmitHoleScore` checks scorekeeper assignment
  - admin-only for `FinalizeTournament`
- [ ] Add audit fields to events (entered_by, updated_by)

---

## Phase 11 — Hardening (Tests, Auditing, Performance)

### Outcomes
- Confidence + speed
- Easier debugging during live events

### Steps
- [ ] Unit test policies:
  - Snake order
  - Filtering rules
  - Recommendation selection
- [ ] Add conflict handling for scoring:
  - Last-write-wins OR explicit correction events
- [ ] Add caching/derived totals if needed:
  - Tournament leaderboard materialized view

---

## Phase 12 — Deployment Readiness

### Outcomes
- Deploy PB + client without architecture changes

### Steps
- [ ] Centralize environment config
- [ ] Confirm PB migrations / schema management
- [ ] Create seed scripts for dev/test
- [ ] Add logging hooks for critical usecases (draft pick, score submit)

---

## Immediate Next Tasks (Highest Leverage)

Build these 3 usecases first:

1. **`CreateGroupsForRound`** — pairings management
2. **`SubmitHoleScore`** — live scoring workflow
3. **`GetDraftOptions`** — filter + recommend logic

Once stable, the rest becomes straightforward.

---

## Your Specifics to Fill In

| Question | Your Answer |
|----------|-------------|
| How many draft rounds? | (likely 4) |
| Roster target after round 4? | (likely 2 male + 2 female) |
| Recommendation basis? | rating / projected points / manual rank / tiers |
| Scoring format? | 18 holes par-3; confirm bounds for throws |

---

## Reference Docs

| Topic | Resource |
|-------|----------|
| SvelteKit | https://kit.svelte.dev/docs |
| Svelte 5 runes | https://svelte.dev/docs/svelte/what-are-runes |
| PocketBase JS SDK | https://github.com/pocketbase/js-sdk |
| PocketBase collections | https://pocketbase.io/docs/collections |
| Zod | https://zod.dev |
| TypeScript | https://www.typescriptlang.org/docs/handbook |

---

## When You Get Stuck

1. Re-read the relevant documentation
2. Check browser console for errors
3. Check terminal for server errors
4. Simplify—remove code until it works, then add back
5. Search the error message
6. Take a break and come back

Good luck. You've got this.
