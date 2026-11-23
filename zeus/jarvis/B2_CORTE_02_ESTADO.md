# ZEUS / SUPERAGENTE JARVIS — BLOQUE 2 · CORTE 02

Fecha: 2026-11-03. Estado: PARCIAL. No confundir JARVIS superagente con interfaz «Jarvis».

## HECHO EN LAB
- Bridge de identidad Fénix (canal) -> principal estable ZEUS con verificación de usuario, claims de sesión, actor de servidor y scopes de compañía externos.
- Adapter Postgres de misiones livianas con deduplicación por `(owner_id,company_id,idempotency_key)` y control optimista de revisión (CAS).
- Contrato SQL para nueva tabla aislada con RLS; **SQL no aplicado a ningún entorno real**.
- Core actualizado para respetar `createIfAbsent`, replay idempotente y revisión después de cada transición.
- Node 22: **17/17 tests PASS** en entorno local, con fakes para Identity y Postgres. No equivale a E2E autenticado.

## PENDIENTE
- Prueba real del canal con tokens autenticados del propietario, tras revisar contrato y sin exponer secrets.
- `resolveCompanies` real del Registry multiempresa y owner identity ZEUS independiente de Fénix.
- Evaluación de aislamiento de Data API, migración versionada y backup/rollback.
- Ejecución persistente real y recuperación multi-dispositivo real.
- Circuit breaker y recuperación de misión en estado AUTHORIZED por caída de worker.
- Promoción gobernada (sin tocar App/CRM).

## POLÍTICA
- No guardar API keys/tokens ni copias de credenciales en biblioteca o repo.
- Inmutable de App/CRM/Trading/SEO/Notion/WordPress y flujos actuales.
- DeepSeek aprobado 50€ declarados, **sin consumo ni comprobación de saldo**.
- NEXT: revisión de seguridad y contratos + integración del Gateway aislado; no hay activación de PROD verificada.