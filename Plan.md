# CoFound — Plan.md

## Project Overview
AI Operating System for Founders. 6 specialized AI advisors that now genuinely debate and synthesize, with full Supabase persistence.

---

## Current Architecture

### Auth
- Setup-token approach retained: users run `claude setup-token` CLI command, paste the bearer token into CoFound
- Token validated via live Anthropic API call on login
- Stored in httpOnly session cookie (7-day expiry, base64-encoded)
- Route protection via `src/middleware.ts` — /dashboard and /onboarding require session cookie

### Data Persistence (Phase 1 - COMPLETE)
- **Supabase Postgres** for all data (brain, rounds, responses)
- User identity: SHA-256 hash of bearer token = `user_id` (no Supabase Auth needed)
- Server-side only: `SUPABASE_SERVICE_ROLE_KEY` used via `src/lib/supabase.ts`
- Schema: `supabase/schema.sql` — run this in Supabase SQL editor on new project

### Database Schema
- `companies`: startup brain, one per user (upsert on re-onboarding)
- `rounds`: each question asked (UUID generated client-side)
- `responses`: agent answers per round, per wave (unique constraint on round_id + agent_id + wave)

### Two-Wave Debate Architecture (Phase 2 - COMPLETE)
**Wave 1**: All 6 agents answer independently in parallel (existing behavior)
**Wave 2**: After Wave 1, user clicks "Go Deeper" - each agent reads all Wave 1 responses and debates, challenges, and reacts
**Synthesis**: After Wave 2 completes, auto-runs a synthesis agent that produces:
- CONSENSUS: What all advisors agree on
- TENSIONS: Real conflicts and what they mean
- DECISION: 3 prioritized actions, specific enough for Monday
- THE ONE THING: One sentence that matters most

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| /api/auth/login | POST | Validate claude setup-token, set session cookie |
| /api/auth/logout | GET | Clear session cookie |
| /api/brain | GET | Fetch company brain from DB |
| /api/brain | POST | Upsert company brain to DB |
| /api/rounds | GET | Fetch all rounds for a company |
| /api/rounds | POST | Create a new round |
| /api/rounds | PATCH | Update round state (wave flags, synthesis) |
| /api/agent | POST | Wave 1 streaming (saves response to DB on complete) |
| /api/debate | POST | Wave 2 streaming (each agent reacts to Wave 1) |
| /api/synthesis | POST | Synthesis streaming (unified council recommendation) |

---

## Key Files

```
src/
├── middleware.ts               Route protection
├── lib/
│   ├── supabase.ts             Server Supabase client + getUserId()
│   ├── agents.ts               6 agent definitions + system prompts
│   ├── synthesis.ts            Synthesis prompt builder
│   ├── brain.ts                CompanyBrain type + formatBrainForPrompt()
│   ├── transcript.ts           Round type (with wave1/debate/synthesis fields)
│   └── session.ts              Cookie session helpers
├── app/
│   ├── login/page.tsx          Token paste UI
│   ├── onboarding/page.tsx     4-step brain wizard (saves to DB)
│   ├── dashboard/page.tsx      Server Component — fetches brain, renders Council
│   └── api/
│       ├── brain/route.ts      Brain CRUD
│       ├── rounds/route.ts     Rounds CRUD
│       ├── agent/route.ts      Wave 1 SSE
│       ├── debate/route.ts     Wave 2 SSE
│       └── synthesis/route.ts  Synthesis SSE
└── components/council/
    ├── Council.tsx             Main orchestrator (debate + synthesis + DB)
    ├── AgentCard.tsx           Sidebar agent toggle
    ├── AgentResponse.tsx       Streaming response card (compact prop for Wave 2)
    ├── QuestionBar.tsx         Input bar
    └── BrainBanner.tsx         Top context strip
supabase/
└── schema.sql                  DB schema — run in Supabase SQL editor
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=...                  # Fallback for local dev
NEXT_PUBLIC_SUPABASE_URL=...           # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=...          # Service role key (server-side only)
```

---

## Setup

1. Create a Supabase project at supabase.com
2. Run `supabase/schema.sql` in the Supabase SQL editor
3. Copy `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings > API
4. Add to `.env.local`
5. `npm run dev`

---

---

## Phase 3 — Context Grounding (COMPLETE)

**Context Notes** — free-form rich context field on the company brain:
- Added `context_notes` column to `companies` table
- New `contextNotes` field on `CompanyBrain` type
- Injected into every agent's system prompt via `formatBrainForPrompt` when non-empty
- Editable in onboarding step 4 (optional textarea — paste pitch deck text, research notes, competitive analysis, financials)

---

## Phase 4 — Actionable Artifacts (COMPLETE)

**Artifacts table** — action items, risks, and experiments extracted from synthesis:
- `artifacts` table: id, company_id, round_id, type (action/risk/experiment), content, completed
- `/api/artifacts` — GET (load by company), POST (bulk insert), PATCH (toggle completed)
- After synthesis completes, synthesis text is parsed for DECISION items (numbered list → `action`) and TENSIONS items (bullets → `risk`)
- Artifacts saved to DB and shown in Council sidebar as a live checkable list
- `ArtifactsPanel` component — collapsible sections per type, check/uncheck with optimistic UI, persists to DB

---

## Next Steps / Ideas

- Document upload: PDF/CSV for richer context (pitch deck, financial model)
- Multiple companies per user
- Shareable council session links
- Model cost display per session
