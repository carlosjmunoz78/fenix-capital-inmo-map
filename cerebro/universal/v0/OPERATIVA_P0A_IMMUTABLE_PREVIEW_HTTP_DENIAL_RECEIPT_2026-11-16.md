# RECIBO FÍSICO · P0-A negativas anónimas del candidato OPERATIVA LAB

Fecha: 16/11/2026. Fuentes: GitHub Actions `43855374329` / job `133258161356` / SHA `9356908494738e7d7b48e89c4eb81edf302351a1`; Vercel deployment inmutable `dpl_4yNnv2F9RCuCtpnHWRUUDXYWfyd8` READY, commit funcional `7ed638d5a3700ae29ea838e6c215179d82962249`.

## Matriz de prueba REAL
| Recurso | Método y ámbito | HTTP | Interpretación acotada |
|---|---|---:|---|
| /cerebro?section=operativa&visual_lab=cockpit-v3 | GET anónimo en Preview | 302 | Redirección SSO, sin seguir destino |
| /api/cerebro-preview-owner | GET anónimo en Preview | 302 | Redirección SSO |
| /api/cerebro-lab-worker-control?company_id=otraempresa | POST sin bearer/body {} | 401 | No autorizado antes de control; no prueba negativa a otro usuario autenticado |
| /api/cerebro-universal-preview | POST sin bearer/body {} | 401 | No autorizado antes de comando |

Resultado: **4/4 pruebas HTTP de denegación anónima PASAN** en `fenix-capital-preprod-hyr2rrwvi.vercel.app`; 0 credenciales compartidas, 0 cookies, 0 redirecciones seguidas, 0 trabajos ejecutados. El SSO y el Proxy pueden denegar por motivos distintos; esta prueba no acredita el comportamiento de Auth posterior al login.

## Verificaciones independientes
- 3 workflows CI SUCCESS; 26 checks SUCCESS + 1 SKIPPED + 0 FAILED en SHA de pruebas.
- Privilegio LAB private session guard: anon=false, authenticated=false, service_role=true (consulta de metadata, sin sesión real).
- Ningún lector homólogo de revocación del emisor PROD encontrado en `public/private/internal` mediante metadata read-only; esto no prueba su ausencia absoluta fuera de esos esquemas.
- Vercel LAB sin credenciales privadas de sesión LAB; runner oficial Auth aún desarmado.

## Semáforo
`P0A_ANON_HTTP_CANDIDATE=GREEN_LIMITED`; `P0A_REVOKED_SESSION_ISSUER=BLOCKED`; `P0B_BUSINESS_RECEIPT_E2E=NOT_CERTIFIED`; `P0I_PROD=HOLD`. No mezclar HTTP negativo con JWT firmado válido y revocado. Mantener PR #66 DRAFT; App/CRM, issuer PROD, Gateway, main, alias estable y DNS intactos. Rollback de cambios de prueba: git revert. Cuota adicional contratada 0; coste real NO_MEDIDO.
