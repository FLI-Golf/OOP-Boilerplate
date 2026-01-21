# Domain Ownership Notes

This document defines aggregate boundaries and ownership rules. When in doubt about where logic belongs, refer here.

---

## Aggregate Roots

An aggregate root is the entry point for all operations on its children. External code should never modify children directly—always go through the root.

---

## Competition Domain

### Season
- **Owns:** List of tournament references
- **Invariants:** 
  - A season has a year and name
  - Tournaments belong to exactly one season

### Tournament
- **Owns:** Rounds, Groups, Scoring state
- **Invariants:**
  - State machine: `scheduled → live → final`
  - Cannot submit scores unless status is `live`
  - Cannot finalize unless all rounds are complete
  - Groups belong to a specific round
  - A group contains teams (not individual pros)
- **Snapshot rule:** Tournament stores course_id at creation. If course is edited later, past tournaments are unaffected.

### Course
- **Owns:** Holes
- **Invariants:**
  - A course has 9 or 18 holes (configurable)
  - Each hole has a number (1-18) and par value
  - Hole numbers are unique within a course
- **Note:** Course edits do NOT retroactively change tournament data. Tournaments reference a snapshot or the course_id at time of creation.

### Team
- **Composition:** Exactly 1 male pro + 1 female pro
- **Invariants:**
  - Cannot create a team without both pros assigned
  - A pro can only be on one team per tournament
- **Validation:** Enforced in usecase layer (requires pro lookup to verify gender)

### Pro
- **Fields:** name, gender (`male` | `female`), rating/rank
- **Invariants:**
  - Gender is immutable after creation
  - Rating can be updated between seasons

### Group (Pairing)
- **Belongs to:** TournamentRound
- **Contains:** 2-4 teams
- **Invariants:**
  - A team appears in exactly one group per round
  - Scorekeeper assignment is per-group

### HoleScoreEvent
- **Type:** Value object (append-only event)
- **Fields:** tournament_id, round_no, group_id, pro_id, hole_no, throws, entered_by, entered_at
- **Invariants:**
  - hole_no must exist on the course
  - throws must be positive integer (reasonable bounds: 1-15)
  - entered_by must be assigned scorekeeper for the group

---

## Fantasy Domain

### FantasySeason
- **Owns:** List of fantasy league references
- **Invariants:**
  - Tied to a competition season
  - Leagues belong to exactly one fantasy season

### FantasyLeague
- **Owns:** Participants, Draft, Rosters
- **Invariants:**
  - State machine: `setup → drafting → active → complete`
  - Cannot start draft until all participants joined
  - Cannot modify rosters during draft
  - Draft rules are owned by the league (not global)

### Draft
- **Belongs to:** FantasyLeague
- **Owns:** DraftPicks, DraftSettings
- **State:** `not_started → in_progress → locked`
- **Invariants:**
  - Pick order determined by SnakeDraftOrder policy
  - Only the participant "on the clock" can pick
  - A pro can only be picked once per draft

### DraftPick
- **Belongs to:** Draft
- **Fields:** participant_id, pro_id, round_no, pick_no, picked_at, auto_picked
- **Invariants:**
  - Immutable after creation
  - Records whether pick was manual or auto

### FantasyRoster
- **Belongs to:** FantasyParticipant
- **Invariants:**
  - After draft: exactly 2 male + 2 female pros (4 total)
  - Roster composition enforced by DraftRules policy

### FantasyParticipant
- **Belongs to:** FantasyLeague
- **Fields:** user_id, league_id, draft_position
- **Owns:** Their roster

---

## Policies (Encapsulated Rules)

### SnakeDraftOrder
Determines pick sequence:
```
Round 1: 1, 2, 3, 4, 5, 6
Round 2: 6, 5, 4, 3, 2, 1
Round 3: 1, 2, 3, 4, 5, 6
Round 4: 6, 5, 4, 3, 2, 1
```

### DraftRules
Filtering logic per round:
- Rounds 1-2: All available pros shown
- Rounds 3-4: Filter based on roster composition
  - If 2 males on roster → only show females
  - If 2 females on roster → only show males
  - Otherwise show all

### RecommendationEngine
Returns the "best" available pro from filtered list:
- Primary: Highest rating/projected points
- Tie-breaker: Alphabetical or random

### AutoPickPolicy
When timer expires:
1. Get filtered options via DraftRules
2. Get recommendation via RecommendationEngine
3. Execute pick
4. Mark as `auto_picked: true`

---

## Cross-Aggregate References

| From | To | Type |
|------|----|------|
| Tournament | Season | Reference (season_id) |
| Tournament | Course | Reference (course_id) — snapshot at creation |
| TournamentRound | Tournament | Belongs to |
| Group | TournamentRound | Belongs to |
| Team | Tournament | Scoped to tournament |
| Team | Pro (x2) | References (male_pro_id, female_pro_id) |
| HoleScoreEvent | Tournament, Group, Pro, Hole | References |
| FantasyLeague | FantasySeason | Reference |
| FantasyLeague | Season (competition) | Reference |
| Draft | FantasyLeague | Belongs to |
| DraftPick | Draft, Participant, Pro | References |
| FantasyRoster | Participant, Pro (x4) | References |

---

## What Lives Where

| Logic | Location |
|-------|----------|
| "Is this state transition valid?" | Domain class |
| "Does this pro exist?" | Repository |
| "Can this user perform this action?" | Usecase |
| "Show filtered draft options" | Usecase (calls domain policy) |
| "Save to database" | Repository |
| "Display data to user" | UI/Component |

---

## Anti-Patterns to Avoid

1. **UI calling repository directly** — Always go through usecase
2. **Domain importing PocketBase** — Domain is persistence-agnostic
3. **Validation only in UI** — Usecase must validate too
4. **Nested object trees from repos** — Return flat DTOs with IDs
5. **Business logic in components** — Extract to domain or usecase
