# ZEUS/JARVIS CHANGELOG · B5 CUT04 · 2026-11-04

## CHANGED
- Speech Port exige roles, scope empresa y owner ID validados estructuralmente.
- Compilador/adaptador de voz mantienen STOP heredado («para ya», «calla»), y piden aclaración cuando STT carece de confianza.
- Model Router exige pruebas financieras exclusivas DeepSeek y scope company/environment, sin llamadas API.

## ADDED
- Contrato B5 Gateway read-only no desplegado: B2/B3, OFF, rate limit, privacidad, local-first, audit.
- TTS español real en CI usando OSS eSpeak NG con WAV efímero/no sensible.
- Ledger SQL PostgreSQL 17 de reservas atómicas, conciliación e idempotencia: solo LAB/DEV, sin grants públicos.
- Pruebas adversarias y comparación OLD/NEW.

## VERIFIED
- Suite LAB 262 PASS / 0 FAIL: Actions 41747051593.
- Governed Integration SUCCESS: 41747051536 (deployment SKIPPED).
- TTS Synthetic Spanish SUCCESS: 41747051464 (sin STT real).
- Atomic FinOps PostgreSQL 17 SUCCESS: 41747051440 (concurrency + restore + rollback).
- B4 PostgreSQL fixture SUCCESS: 41747051610.

## NO GO / ROLLBACK
No hay endpoint B5 PROD, ni modelo o voz comercial conectado, ni saldo DeepSeek verificado, ni backup/restore PROD probado. Mantener B3/B4 OFF. No fusionar PR #13–15. Revertir solo commits de PR #15 posteriores a 2d960fd0bde9d8b592da3d2e220ee7e0fbd1faaf si se necesita rollback del corte 04.
next_block=B5_CUT05_AUTHENTICATED_GATEWAY_AND_PROVIDER_PREPROD_PROOFS_UNDER_OFF
