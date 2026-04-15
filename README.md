# CoFound — AI Operating System for Founders

> Your AI co-founder that never sleeps.

CoFound gives every founder a council of 6 specialized AI advisors that debate, strategise, and push back — all in parallel, all grounded in your startup's context.

---

## What it does

You fill in your **Company Brain** (startup name, problem, ICP, stage, metrics, goals) and then ask your council anything. Six agents respond simultaneously, each from their own lens:

| Agent | Role |
|---|---|
| 📊 Market Research | Market size, trends, competitive landscape |
| 😈 Devil's Advocate | Pokes holes in every assumption |
| ⚡ Growth Agent | Experiments, channels, acquisition tactics |
| 🎯 ICP Analyst | Customer segmentation and validation |
| 🚀 GTM Strategist | Go-to-market playbooks and 90-day plans |
| 💰 Investor Lens | Fundability, proof points, what VCs will think |

Responses are **streamed in parallel** so you see all six agents thinking and writing at once. Conversations are **multi-turn** — each agent remembers what it said before and can be pushed on follow-ups. Your transcript persists across sessions.

---

## Tech stack

- **Next.js 16** (App Router, Server-Sent Events)
- **Anthropic SDK** (`@anthropic-ai/sdk`) — `claude-opus-4-5` with adaptive thinking
- **Auth**: `claude setup-token` OAuth bearer token — no API keys required
- **Tailwind CSS** — full dark theme
- **localStorage** — Company Brain + transcript persistence

---

## Getting started

### Prerequisites

- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) with a **Max plan**

### 1. Clone and install

```bash
git clone https://github.com/dev-sanidhya/CoFound.git
cd CoFound
npm install
```

### 2. Environment

```bash
cp .env.local.example .env.local
```

For local dev without going through the login UI, you can set a fallback API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Authentication

CoFound uses the **`claude setup-token`** approach — no OAuth app registration needed.

1. Open your terminal and run:
   ```bash
   claude setup-token
   ```
2. Copy the token it outputs (starts with `sk-ant-oat` or similar)
3. Paste it into the CoFound login page

The token is valid for **1 year** and is stored in a secure httpOnly session cookie. API usage is billed directly to your Anthropic account.

> Requires Claude Code CLI installed and a Claude Max plan subscription.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Token paste UI
│   ├── onboarding/page.tsx   # 4-step Company Brain wizard
│   ├── dashboard/            # Main council workspace
│   └── api/
│       ├── agent/route.ts    # Streaming agent API (SSE)
│       └── auth/             # Login / logout
├── components/council/
│   ├── Council.tsx           # Rounds-based conversation orchestrator
│   ├── AgentCard.tsx         # Sidebar agent toggle
│   ├── AgentResponse.tsx     # Streaming response card
│   ├── QuestionBar.tsx       # Input bar
│   └── BrainBanner.tsx       # Top context strip
└── lib/
    ├── agents.ts             # 6 agent definitions + system prompts
    ├── brain.ts              # CompanyBrain type + localStorage
    ├── transcript.ts         # Round/history types + localStorage
    ├── session.ts            # Cookie-based session
    └── oauth.ts              # Token validation utility
```

---

## License

MIT
