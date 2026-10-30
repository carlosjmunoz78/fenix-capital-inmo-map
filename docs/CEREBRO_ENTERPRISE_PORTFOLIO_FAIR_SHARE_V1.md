# CEREBRO Enterprise Portfolio Fair-Share V1

Status: PREPROD_CANDIDATE
Date: 2026-10-31

## Live verified capacity
- Total concurrent jobs: 360.
- macOS concurrent jobs: up to 50.
- Documented Enterprise topology above the live entitlement remains fail-closed.

## Allocation
- NEURONAL: 100 concurrent jobs, refill=100.
- Portfolio W00-W24: 250 concurrent jobs = 25 fronts × 10 distinct shards.
- Control reserve: 10 slots.
- Total: 360.

## Portfolio fronts
W00-W24 include live-state/evidence, Browser, browser extension, PC, mobile JARVIS, notifications, identity, Social, SEO, agents/subagents, Skill Engine, App Fénix, Console/JARVIS, voice, memory/knowledge, Model Router, Learning/RSI, Browser procedures, security, E2E, JARVIS View, App Factory and ZEUS.

## Rules
- One shared physical pool; no second queue/scheduler/daemon.
- Shards partition distinct repository paths where possible; no duplicate empty jobs.
- PREPROD only, PROD writes false, Trading false.
- DeepSeek remains explicit opt-in, max 8, no auto recharge.
- macOS runners are used only when work genuinely requires macOS/iOS/Safari tooling.
