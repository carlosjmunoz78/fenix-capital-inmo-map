# CEREBRO · Conversational Learning + Dynamic Prosody V1

Date: 2026-10-01
Company: fenix
Cost target: 0 EUR additional

## Requirement corrected by owner

The desired behavior is **not** to make the voice globally slower.

The current base speaking rhythm is preserved. The goal is:
- natural intonation;
- sentence-level pace variation;
- questions, confirmations, lists and risk/confirmation phrases may use slightly different rate/pitch;
- no global slowdown unless the owner explicitly asks for it.

The larger requirement is that CEREBRO **acquires knowledge from conversations continuously**, rather than learning only explicit style preferences.

## Voice design

Browser-native speech synthesis remains the zero-cost transport.

Base profile remains:
- speech_rate = 0.96
- speech_pitch = 1.04

The frontend now splits spoken output into bounded sentence/clause segments and applies small contextual deltas:
- acknowledgements: slightly faster/lighter;
- questions: slightly raised pitch;
- safety/action-confirmation language: slightly slower/lower;
- enumerations/long clauses: small slowdown for intelligibility;
- final declarative segment: slight cadence drop.

This is deterministic prosody shaping. It does not claim neural expressive TTS.

## Conversational learning design

CEREBRO now has two different learning layers:

1. **Explicit preferences**
   - voice style;
   - wording;
   - pronunciation;
   - response length;
   - workflow/interaction preferences.
   - durable persistence remains explicit.

2. **Conversational knowledge**
   - every non-trivial owner turn is considered for learning automatically;
   - safe turns are stored as bounded episodic memory;
   - memory is searchable and can be retrieved in later conversations;
   - recall queries are not stored as new knowledge, preventing self-pollution;
   - repeated identical knowledge is deduplicated and increments seen_count;
   - memory can be deactivated with explicit commands such as “olvida lo que te dije sobre …”.

## What is stored

Only bounded user text that passes the safety filter:
- max 2000 characters;
- company/actor scoped;
- engine/environment/version tagged;
- memory kind;
- content hash;
- first/last seen timestamps;
- seen_count;
- full-text search vector.

No audio is stored.

No assistant reply is promoted as owner knowledge merely because CEREBRO said it.

## What is rejected from general conversational memory

The runtime rejects or skips:
- passwords and credentials;
- access/refresh tokens;
- service-role/API keys/private keys;
- JWT-like values;
- DNI/NIE/IBAN/card/PIN patterns;
- email addresses and telephone-number patterns;
- explicit medical-history/medication material;
- trivial acknowledgements such as “ok”, “sí”, “procede”, “continúa”;
- recall questions themselves.

Operational personal/contact data must continue through CRM/entity-specific contracts rather than becoming general conversational memory.

## Retrieval precedence

Conversational memory is a source, not automatically a higher authority than canonical operational data.

- Explicit recall questions (“¿qué te dije sobre…?”) prioritize conversational memory.
- Canonical live/domain answers keep priority for operational state.
- General knowledge fallback may combine relevant conversation memory with authorized Notion knowledge.
- Memory-derived evidence is labeled `CONVERSATION_MEMORY`.
- When canonical and remembered statements conflict, later arbitration/versioning is required; memory must not silently overwrite live operational truth.

## Storage architecture

A new lightweight table:
`fenix_prod.cerebro_conversation_memory`

This is intentionally not a raw transcript warehouse and not a heavy training-log system.

Direct anon/authenticated access is denied. Runtime access is through service-role server RPCs only:
- observe;
- search;
- forget/deactivate.

This preserves the project rule that heavy logs/training should live outside Supabase while allowing a small operational memory index to support cross-session recall.

## PREPROD evidence

The exact repository migration was executed transactionally in PREPROD with a disposable actor stub.

Validated:
- observation write;
- exact deduplication;
- seen_count increments to 2;
- Spanish full-text retrieval;
- explicit forget/deactivation;
- forgotten memory no longer returned;
- full rollback.

Result:
`GREEN_CONVERSATIONAL_MEMORY_EXACT_MIGRATION_ROLLBACK`.

## Status before merge

- Dynamic prosody code: IMPLEMENTED / branch candidate.
- Conversational memory schema + RPCs: IMPLEMENTED / PREPROD exact migration GREEN.
- Automatic safe-turn observation: IMPLEMENTED / branch candidate.
- Cross-session memory retrieval: IMPLEMENTED / branch candidate.
- Sensitive-data skip policy: IMPLEMENTED / branch candidate.
- PROD: NOT YET PROMOTED.
- Physical acceptance: PENDING.
