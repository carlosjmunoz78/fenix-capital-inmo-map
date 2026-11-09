# CEREBRO OS · JARVIS · Credenciales efímeras GitHub OIDC · LAB V0

**Estado:** `HECHO EN LAB` para autenticación técnica sin claves humanas. **NO sustituye el E2E de usuario de la App. No promocionado a PROD.**

## Contrato y alcance exactos

- `company_id=fenix`, `engine_id=CONSOLE-001`, `environment=LAB`, `version=v0`.
- Proveedor de identidad técnica: GitHub Actions OIDC (emisor `https://token.actions.githubusercontent.com`, JWKS público oficial, algoritmo `RS256`).
- Público objetivo: un único workflow en `carlosjmunoz78/fenix-capital-inmo-map` sobre `refs/heads/cerebro/jarvis-git-parity-lab-20261109`.
- Audiencia cerrada: `jarvis-oidc-probe-lab-v0`.
- El servidor también verifica la firma, issuer, audience, `repository`, `ref`, `workflow_ref`, `event_name=push`, SHA, `run_id`, timestamps de emisión y expiración; se admite `sub` personalizado de GitHub **solo** porque los demás campos firmados validan identidad y alcance.
- **Nunca se emite un JWT Supabase personal, no se crea actor `DIR-TEST`, no se consulta base de datos y no se habilita ninguna operación de trabajo o Git.**
- Supabase de pruebas existente: `hnqlnvakzaywtafeiybt`, región `eu-north-1`, plan existente de la organización: Pro. No se ha contratado otro plan ni creado otro proyecto. El consumo de invocaciones no se ha cuantificado; **no afirmar coste marginal exactamente 0 € sin comprobación de facturación**.
- Nueva función aislada `jarvis-oidc-probe-lab-v0`, versión 2, `verify_jwt=false` **porque la autenticación propia verifica estrictamente la firma OIDC GitHub**. Está disponible únicamente la operación `POST /attest` y cualquier otra ruta recibe rechazo. La función no accede a Supabase Auth, CRM, App ni Trading.

## Evidencias físicas

| Gate | Resultado |
| --- | --- |
| Fuente registrada en GitHub | `supabase/functions/jarvis-oidc-probe-lab-v0/index.ts` en rama LAB |
| Despliegue nuevo, sin reemplazar funciones existentes | Supabase proyecto `hnqlnvakzaywtafeiybt`, versión 1 inicial, versión 2 corregida, `ACTIVE` |
| Token GitHub OIDC válido, firmado y de audiencia acotada | `200 OK`, `SIGNED_GITHUB_OIDC_READONLY` |
| POST sin token | `403 DENIED` |
| POST con token falso | `403 DENIED` |
| Ruta no autorizada | `404 NOT_AVAILABLE` |
| JWT firmado con firma manipulada | `403 DENIED` |
| JWT GitHub válido pero audiencia distinta | `403 DENIED` |
| Comparación de run ID y SHA de la ejecución | VERDE |
| Escrituras en DB, repo, CRM, App, Trading | **Ninguna** |
| Nuevos secretos persistentes | **Ninguno** |

La ejecución definitiva es [GitHub Actions run 42540782126](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42540782126), estado `completed/success`, seis comprobaciones validadas. La anterior [42540695844](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42540695844) también superó cuatro verificaciones (sin las dos negativas firmadas adicionales).

El diagnóstico previo [42540606037](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42540606037) identificó que GitHub emite un `sub` personalizado por configuración de cuenta/organización. La comprobación inicial de `sub` fijo se corrigió manteniendo el control estricto de firma y claims `repository/ref/workflow_ref` firmados; ningún secreto se imprimió.

## Seguridad, continuidad y rollback

- Código de la prueba bajo rama `cerebro/jarvis-git-parity-lab-20261109`. NO fusionar automáticamente en `main`.
- No cambiar ni quitar `verify_jwt` de funciones existentes de App o JARVIS. La excepción `verify_jwt=false` es solo de la nueva función que **verifica GitHub OIDC internamente**.
- Si debe desactivarse la nueva función, realizar una actualización aislada de la propia función con una implementación fail-closed que responda `403` a toda petición, o eliminarla desde la administración de Supabase previa comprobación de dependencias. Nunca hacerlo sobre otras funciones.
- No ampliar el alcance a `repo write`, `actions write`, OIDC multiempresa, sesiones de usuario o Gateway principal sin contratos, backup, PREPROD, permisos, tribunal y pruebas comparativas.
- Un JWT GitHub para operación técnica no prueba identidad `CARLOS-ADMIN` ni puede usarse como bearer Supabase Auth; para la App sigue pendiente un E2E de usuario renovable con principio de mínimos privilegios.
- La función no implementa encolado, lectura de base de datos ni acceso al repositorio. Su función es **probar un canal de identidad técnica reutilizable para futuros motores**, no dar por completo el servicio JARVIS.

## Gate de promoción

Pendientes: `AUTH_USER_E2E_RENEWABLE`, `GIT_UI_GATEWAY_TO_JOB_SUCCEEDED`, `PHYSICAL_MIC_VOICE`, `OLD_VS_NEW_SERVICE_PARITY`, `RESTORE_REVERSAL_TEST`, `TRIBUNAL`.

**PROD NOT PROMOTED.** Regla CEREBRO: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
