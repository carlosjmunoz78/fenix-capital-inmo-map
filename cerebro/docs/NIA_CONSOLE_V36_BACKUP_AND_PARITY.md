# Console v36 baseline physical snapshot · 17/11/2026

This source is copied from live Supabase Edge Function `cerebro-console-gateway-v0`, production project `cluhljgonannaafpmblx`, version **36**, original `ezbr_sha256=236eafba0c4c3a401df2cd4c05fedeb7b635aa9658488a155622a4f52360e041`.

File set: `index.ts`, `knowledge.ts`, `conversation_intents.ts`, `activity_reader.ts`; none contain Supabase Vault decrypted secrets. Original source saved verbatim in backup directory for exact rollback. A parallel lab candidate differs only by one added import and a two-line explicit NIA intent interception in `chatReply`. Removing those two additions yields byte-for-byte the original index.ts.

Do not deploy this candidate to the main `cerebro-console-gateway-v0` without owner-authenticated tests, QA/cost/rollback/evidence gates. GitHub Actions banned.
