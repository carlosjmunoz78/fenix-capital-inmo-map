# CEREBRO Spoken Summary V2 · deploy marker

Date: 2026-10-01
Company: fenix
Additional recurring cost: 0 EUR

Goal:
- move from simple truncation/first-sentences speech to intent-aware, semantic spoken summaries;
- keep full written output unchanged;
- keep raw links, emails, hashes and CI identifiers written rather than spoken;
- transform lists into natural spoken language;
- preserve critical failures and explicit action confirmations;
- use response metadata (status, intent, action, read_context) when available.

Evidence before promotion:
- PR #465 exact head: ab7c1fdd8bb6ab7fcd90f9d610bbedafc5209c51
- CEREBRO Session Context Regression Guard #131: SUCCESS
- App Restoration Build Gate #379: SUCCESS
- behavioral spoken-summary corpus: GREEN
- merge: 20280fa5f3afc83723db19ca0fcd063a364d164f
- previous exact frontend rollback source: b64050f0320f31e1685fa028744e73e5920c8655

This release changes frontend spoken presentation only. It does not modify Gateway permissions, action policy, conversational-memory storage or business writes.

Physical listening acceptance remains required after production deployment.
