# B9 · Matriz de evidencia y limitaciones
| Caso | Resultado | Clasificación | Evidencia |
|---|---|---|---|
| 462 suite Node (B1–B9 + regresiones) | PASS 462 / FAIL 0 | LOCAL_LAB_TEST | run 41794601700 |
| Multiagente B7 regresión | SUCCESS | LOCAL_LAB_TEST | run 41794601734 |
| B4 PostgreSQL 17 regresión existente | SUCCESS | REAL_LAB_INTEGRATION, B4 only | run 41794601689 |
| Integración gobernada | SUCCESS / Deploy PROD no realizado | LOCAL_LAB_TEST | run 41794601696 |
| B9 dos empresas sintéticas en autorización/journal fixture | PASS | SYNTHETIC_TEST | `jarvis-b9-governed-recovery.test.mjs` |
| B9 anti-loop 3 fallos, permisos, costes, concurrencia ambigua | PASS | SYNTHETIC_TEST | suite Node |
| Backup y rollback de archivos temporales, hash/restauración byte-idéntica | PASS | LOCAL_LAB_TEST | `jarvis-b9-rollback-lab.test.mjs` |
| OLD vs NEW, holdout, Goodhart, juez independiente, no auto-promoción | PASS | LOCAL_LAB_TEST | `jarvis-b9-legacy-compatibility.test.mjs` y `jarvis-b9-promotion-gates-compat.test.mjs` |
| Transferencia de aprendizaje entre empresas | Validación de candidato únicamente, sin tráfico real | SYNTHETIC_TEST | suite Node |
| B9 PG17 recovery con dos empresas y dump/restore | **NO EJECUTADO**, workflow bloqueado | POR AUDITAR | script preparado sin run |
| B2/B3/SUP/JDG real en B9 | **NO VERIFICADO** | POR AUDITAR | no afirmar grants |
| P23/observabilidad/backup sistema PROD | **NO VERIFICADO** | POR AUDITAR | sin modificaciones |
| Supabase PROD B3/B4 | OFF + kill switches ON por lectura SQL | REAL_EXTERNAL_READ | tool read-only |
| Coste efectivo de Actions | NO VERIFICADO | POR AUDITAR | sin suscripción nueva |

**Regla:** B9 aún PARCIAL. CI verde no certifica autonomía real ni reparación en PROD.
