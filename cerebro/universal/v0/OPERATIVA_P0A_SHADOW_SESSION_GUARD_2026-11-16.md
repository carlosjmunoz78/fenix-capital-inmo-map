# CEREBRO OS · P0-A · Shadow gate de sesión estricta · 2026-11-16

**ESTADO: IMPLEMENTADO EN RAMA LAB, NO INTEGRADO, NO DESPLEGADO, NO CERTIFICADO EN VIVO.**
Ruta: `cerebro/universal/v0/owner-session-gate-shadow.mjs` + tests `owner-session-gate-shadow.test.mjs`.

## Por qué existe
El Gateway Fénix actual autentica con `supabase.auth.getUser(access_token)`, resuelve actor activo y devuelve `CARLOS-ADMIN`; los lectores actuales dependen de este contrato. La documentación oficial de Supabase distingue entre validez criptográfica del JWT y revocación estricta de sesión: un token firmado puede seguir siendo utilizable hasta `exp` después del cierre de sesión, a menos que el componente privilegiado compruebe existencia de `session_id` en `auth.sessions`.

## Contrato preparado, aún NO integrado
`authorizeOwnerLabRead({identity, verifiedClaims, issuer, environment, nowMs}, readActiveSession)` exige:
- `identity` resultado autenticado/activo `CARLOS-ADMIN`, tenant Fénix, user_id UUID;
- `verifiedClaims` **verificados criptográficamente por el emisor** (no `JSON.parse(atob(jwt))`), `iss` exacto, `sub` vinculado al usuario, `session_id` UUID, `exp/nbf/iat` temporalmente válidos; sólo `environment=LAB`;
- `readActiveSession`: callback **server-only** ya autorizado y de consulta fija `auth.sessions`, en el proyecto que emite el JWT, filtrando por id de sesión Y user_id. Callback inexistente/fallido, registro inexistente/revocado, vencido o distinto => DENIED.
- Nunca se envían IDs, JWT, credenciales o datos de clientes en el resultado. El módulo solo devuelve ALLOW/DENIED + motivo estable y `executed:false`.

**Trust boundary crítico:** el contrato no prueba por sí mismo las firmas ni la procedencia del callback. El integrador deberá invocar `auth.getUser`/`getClaims` de forma servidor a servidor, verificar que corresponden al **mismo token** y la misma instancia emisora, y configurar un reader con credenciales internas y timeout. **Nunca confiar en `verifiedClaims` o `identity` aportados por el navegador**. El lector de `auth.sessions` requiere privilegio legítimo, no se crea nuevo RPC público ni se aflojan RLS/grants. Las credenciales PROD no deben entrar en LAB, GitHub ni frontend. Evitar accesos cruzados de service_role.

## Ensayos solo sintéticos
Se incluyen pruebas: allow con lector simulado que devuelve sesión vigente, token aparentemente válido pero sesión revocada/ausente, no-owner, compañía ajena, issuer incorrecto, claims incoherentes, JWT vencido, lector fallido, sesión cruzada/expirada, sin exposición de secretos. **CI verde no equivale a revocación real ni prueba criptográfica.**

## Gate para activar
1. Aprobar vía seguridad un componente **existente** o nuevo independiente del lado del emisor, que consulte `auth.sessions` sin cambiar el Gateway ni comprometer tokens. La autorización de implementación en PRODUCCIÓN es un gate separado; no modificar el Gateway directamente.
2. Probar con cuenta y sesión de pruebas, creación y cierre voluntario de sesión, y rechazo real con JWT previo mientras siga en vigor, **sin revocar sesiones reales del propietario**.
3. Integrar en un endpoint LAB nuevo paralelo, no reemplazar lectores actuales sin OLD vs NEW, deny negatives y rollback físico.
4. Solo después de pruebas, costes, controles de política y tribunal, considerar promoción. Mientras tanto `P0A_REVOKED_SESSION_GUARD=PARTIAL`, `PROD=HOLD`.

**Coste incremental suscripciones:** 0 €; coste real de GitHub Actions y consultas NO_MEDIDO.
