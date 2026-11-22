# FACT-001 · Token mínimo: cambio de Vault preparado, sin desplegar

**Estado:** DEFINED/OFF en PR #44 DRAFT. No cambia runtime, no crea secretos ni instala servicios nuevos.

OLD: `cerebro-fact001-console-owner-canary-lab` ACTIVE v2 utiliza el secreto cifrado de LAB `cerebro_fact001_cf_readonly_lab_20261109`. El nombre sugiere readonly, pero la credencial subyacente tiene poderes más amplios: restringida solo por el código del servicio a GETs.
NEW: candidato para el mismo runtime que sustituye exclusivamente la constante VAULT_NAME por `cerebro_fact001_cf_readonly_v1`. Si el nuevo secreto no existe, **debe fallar cerrado**, jamás elegir la clave amplia. No modifica la Consola principal `cerebro-console-gateway-v0` v33 ni su interfaz.

El parche de fuente está anclado al blob SHA real y tiene rollback byte-idéntico. GitHub Actions ejecuta pruebas de cambios mínimos, no llama APIs de Cloudflare y no despliega la versión candidata.

Requisitos previos de activación:
1. El propietario debe crear un token distinto `CEREBRO-FACT001-READONLY-V1` en Cloudflare, limitado a la cuenta autorizada, con SOLO Account Resources Read, D1 Read y Workers Scripts Read necesarios para los dos GET actuales; otras APIs como Access/KV requieren permisos Read adicionales individuales. No usar Account API Tokens Edit ni DNS/Workers/D1 Write en este perfil.
2. Almacenar ese token en Supabase Vault bajo el nombre exacto `cerebro_fact001_cf_readonly_v1` usando una interfaz autenticada, sin compartir el valor por el chat ni en GitHub.
3. Validar con una operación GET la efectividad del token nuevo desde el servicio aislado y con un JWT de propietario **vigente**; la App cargada y la presencia de sesiones en auth.sessions no son la prueba positiva de `getUser`.
4. Con gates verdes, aplicar patch al mismo canary paralelo en LAB, tests de identidad y lectura, fallos 401/403/429 y rollback; luego integrar el main Console v33 solo tras la promoción gobernada.

Rollback: reponer solo la constante original en canary con el blob versionado. Nunca borrar Vault secret antiguo antes de la validación. La PR permanece DRAFT. **No ejecutar `main` ni alterar App/CRM/DNS**.
