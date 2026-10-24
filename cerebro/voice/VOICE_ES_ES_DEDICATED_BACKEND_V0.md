# VOICE-001 · Dedicated Spanish (Spain) backend V0

Status: `DEFINED / NOT_YET_PHYSICALLY_ACCEPTED / PREPROD_ONLY`

## Purpose

Move VOICE-001 away from the broad multilingual default voice that failed owner listening QA and evaluate a dedicated Spain-Spanish path using an authorized reference.

## Candidate backend

Primary candidate: `ResembleAI/Chatterbox-Multilingual-es-es`.

This is the dedicated Spanish (Spain) finetune in the Chatterbox Multilingual V3 Single Language Pack. Target locale is `es-ES`; language id is `es`.

The broad multilingual default voice is explicitly NOT an accepted CEREBRO voice. It remains technical evidence only.

## ESM05 target

`ESM05` is reserved as the first executive AI target. The target is an original CEREBRO voice with these characteristics:

- masculine, medium-low to low register;
- calm, controlled, precise and highly intelligible;
- natural conversational delivery, not radio-announcer delivery;
- restrained emotion and subtle dry irony when appropriate;
- neutral peninsular Spanish with no Latin-American drift;
- consistent accent and pronunciation over long-form conversation.

The target does not authorize copying or impersonating any actor, character performer or identifiable real person's voice.

## Reference rule

A candidate may run only with an authorized `es-ES` reference already admitted by the VOICE-001 consent/provenance policy. Movie audio, broadcast audio, scraped clips and ambiguous-license references are forbidden.

## Evaluation sequence

1. Register one authorized Spanish-Spain reference privately.
2. Generate the fixed ESM05 QA corpus with the dedicated `es-ES` backend.
3. Compare against the rejected broad-multilingual baseline.
4. Physical listening gate by owner: accent, intelligibility, naturalness, consistency, character fit.
5. Any Latin-American drift event or unintelligible phrase fails the candidate.
6. Only after physical acceptance may EVA-001 and JDG-001 evaluate PREPROD promotion eligibility.

## Authority boundary

- `automatic_promotion=false`
- `prod_enabled=false`
- `public_clone_enabled=false`
- no App/CRM/Supabase/WordPress/Trading binding
- browser/system TTS remains rollback/fallback until a replacement is physically accepted

## Cost

Target additional recurring API cost: `0 EUR`. Model assets and inference are intended for local/self-hosted execution. Physical compute cost and latency must still be measured before PREPROD acceptance.
