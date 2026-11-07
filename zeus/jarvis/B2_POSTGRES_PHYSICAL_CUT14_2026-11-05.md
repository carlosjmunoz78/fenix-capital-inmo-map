# JARVIS · CUT14 · Validación física B2 en PostgreSQL aislado
Fecha: 2026-11-05 · Estado: LAB TEMPORARY PG GREEN · PROD NO-GO

## Evidencia física nueva
- PR #25 HEAD probado: `08447ddc708013443794ab450cab784a71dcbde4`.
- GitHub Actions JARVIS Universal Core LAB #194: run `42108414650`, job `127529282327`.
- Node: **572 pass / 0 fail / 0 skipped** (salida del job).
- Paso nuevo `CUT13 isolated PostgreSQL permissions and restore`: **SUCCESS**.
- Log exacto: `CUT13 PostgreSQL isolation, read-only RLS and snapshot restore: PASS`.
- Postgres 17 temporal con 2 filas sintéticas, rol lector `jarvis_lab_reader` y protección para escritura. Se observó denegación `permission denied for table owner_binding_v0` en el intento negativo esperado.
- `pg_dump` del esquema y datos + restauración en otra base temporal y mismo número de registros: **PASS**.
- Job de GitHub puede seguir con cleanup; los pasos de prueba relevantes resultaron success.

## Alcance estricto
- Se certifica aislamiento temporal de permisos y copia/restauración de **esquema B2 sintético**.
- NO se certifica PostgreSQL persistente, Vault real, sesión OWNER_ROOT real, dos dispositivos, grants B3 reales, autorización de escrituras/ejecuciones ni Gateway desplegado.
- CI de B4/B7/Integración Gobernada permanece independiente; un job verde no habilita PROD.
- App, CRM, ANA, Trading, WordPress, Supabase PROD, `main` y su runtime NO tocados.
- B3/B4 en PROD siguen deshabilitados según última lectura (no se cambió ningún switch).
- Coste adicional contratado: 0 EUR.

## Siguiente bloqueo
1. Auditar candidato de LAB persistente sin mezclar sistemas protegidos ni asumir que proyecto Supabase alternativo está libre.
2. Conectar rol PostgreSQL mínimo y Vault/HMAC server-only a registry B2, con snapshots y restauración probados contra recurso persistente.
3. Verificar sesión OWNER_ROOT auténtica con canal ya existente y registro firmado, sin copiar JWT en chat ni logs.
4. E2E dos dispositivos con revocación, misión persistente, auditoría y tribunal B10.
5. Antes de cada promoción: OLD vs NEW, flag OFF, rollback y gate explícito.

Rollback: revertir cambios CUT12-CUT14 solo de PR #25; no existen cambios en DB PROD.
