# JARVIS B2/B3 · CORTE 10 · Permisos y bloqueos reales (solo lectura)
Fecha: 2026-11-05. Estado: PARCIAL · LAB HARDENING · PROD NO-GO.

## Evidencia física recibida hoy
Supabase proyecto PROD `cluhljgonannaafpmblx`, esquema privado `zeus_jarvis` consultado SOLO con SELECT. RLS = true en tablas B3/B4.
- B3 `fenix/PROD`: `enabled=false`, `kill_switch=true`.
- B4 `fenix/PROD`: `enabled=false`, `kill_switch=true`.
- B3 owner_grants = 0; secret_inventory = 0; audit_events = 0; B4 memory_event = 0.
- Esto verifica una denegación por falta de permisos y datos operativos, NO un fallo en el plan de pago.

Inspección de Edge Functions desplegadas SOLO EN LECTURA:
- `jarvis-work-gateway-v1` v3 ACTIVE: autentica `auth.getUser` y RPC `fenix_prod_actor_context_by_auth_server`; autoriza actores legacy `CARLOS-ADMIN` o `DIR-TEST`, NO llama a `zeus_jarvis.b3_runtime_control` ni a su política B3.
- `jarvis-orchestrator-v0` v2 ACTIVE: patrón similar `auth.getUser` + RPC legacy; NO usa esquema B3.
- `cerebro-console-gateway-v0` v33 ACTIVE: autenticación owner legacy, sin validación demostrada de identidad B2 como OWNER_ROOT para el superagente.
- **ACTIVE/DEPLOYED no equivale a B2/B3 integrado ni a permisos efectivos del superagente.**
- La admisión legacy de `DIR-TEST` debe INVENTARIARSE y verificarse contra el contrato y pruebas existentes ANTES de modificarla; no inferir un permiso real explotable desde esta lectura.

## Corrección aditiva de LAB
- `jarvis-b3-decision-service.mjs` exige token string no vacío, IDs owner/session válidos, roles y authorizedCompanies arrays reales; nunca confía en `.includes` de strings/objetos.
- Nuevas pruebas `jarvis-b3-owner-identity-hardening.test.mjs`: suplantación por arrays falsos, tenant, sesión, token, auditoría, caso positivo y negativa.
- Preservar la decisión B3 actual, los ocho motivos HUMAN_REQUIRED, política de kill switch, audit append-only y los contratos App/CRM. No fusionar por documentar.

## Bloqueos para autonomía real
1. Adaptador B2 identityProvider con JWT validado + actor `CARLOS-ADMIN` + sesión firmada y scoping de empresa; verificación de dos dispositivos reales y revocación.
2. Puente server-only desde Gateway/Orquestador actuales al servicio B3 bajo flag `OFF`, sin autorizar por `DIR-TEST` salvo contrato y evidencia explícitos.
3. Enrolar mandatos OWNER_ROOT de mínimo privilegio, expiración, revocación y permisos específicos con autorización física auténtica del propietario. **No crear grants ni credenciales por suposiciones**.
4. Auditoría real de operaciones de lectura autorizada, política de privacidad, rate-limiting, idempotencia y RLS/Vault.
5. Backup físico/restauración B3+B4 en infraestructura aislada, gates B7–B10, pruebas PREPROD aisladas (no modificar App real).
6. Promoción gradual exclusivamente tras E2E, tribunal, coste controlado y rollback.
7. Verificar qué ramas PR #13–#20 están integradas y no provocar regresiones en PROD.

## NO CAMBIOS EN PROD
Ninguna migración, grant, JWT, secret, sesión humana, enable/kill switch, función desplegada, motor ni tabla modificados. No se reescribe el actor legacy `DIR-TEST` desde LAB. V1/JARVIS V2 voice quedan aparcados.
Rollback: cerrar PR DRAFT de este corte sin fusionarlo. Comparación OLD vs NEW limitada al preflight B3 de LAB.
