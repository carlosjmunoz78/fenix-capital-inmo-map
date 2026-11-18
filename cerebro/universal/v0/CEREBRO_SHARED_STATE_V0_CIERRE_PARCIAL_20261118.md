# CEREBRO OS · STATE-001 · Cierre de candidato universal (18/11/2026)

**ESTADO: PARCIAL · CONTRATO + LAB GREEN · NO PROMOVIDO A PROD.**

## Qué existe físicamente

- Rama: `cerebro/shared-state-all-interfaces-v0-20261118`, PR [#79 DRAFT](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/79).
- Aplicación: un proveedor compartido `CerebroSharedStateProvider` expone la misma información a JARVIS, OPERATIVA, NEURONAL, NAVEGADOR y V0, sin crear 5 feeds ni 2506 conectores. `api/cerebro-shared-state.ts` ofrece `mode=summary` y `mode=profiles`, con propietario verificado y paginación.
- Arquitectura: 2506 perfiles lógicos originales, `kind:id`, familias y relaciones `parent_id` intactas. **8 familias ≠ 8 departamentos de la empresa**. El catálogo no se ha movido.
- Cambios de estado: `ACTIVO, PERFECTO, PARCIAL, FALLANDO, DEFINIDO, POR_VERIFICAR`, más salud `DEGRADADO` de la fuente. Actualización frontend cada 30 segundos. Ningún especialista pasa a ACTIVO solo por pertenecer a un motor: requiere `profile_key` exacto y `profile_provenance=EXPLICIT_EXECUTOR_ATTESTATION` en la fuente autenticada. Un resultado `success` sin Tribunal+pruebas+rollback no equivale a PERFECTO.
- **No se han añadido nuevos Workers, D1, funciones, suscripciones ni bases de datos.** El proveedor reutiliza el runtime y la actividad actual; el Gateway owner-only original no se ha editado.

## Pruebas

- GitHub Actions [44329932584](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44329932584) SUCCESS en rama: compilación, regresión OLD vs NEW, contrato 2506 y seguridad. Pruebas posteriores de perfil explícito y calidad `PERFECTO` también han pasado en Actions.
- Último despliegue **privado y aislado** `dpl_GmS5Z9FtPBxpVk8hrPFXg7FEhRHL` READY, URL `https://fenix-capital-preprod-a25o9g4yb.vercel.app`, SHA código `5d01a2bebf16900ba0e133bd0fa5660cd1857cc6`, **cero aliases**. La rama posterior solo añade controles GitHub y documentación.
- [Stage 44329932532](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44329932532): 401 sin autenticar, 400 otra empresa, 405 POST, 403 cuenta técnica. **PASS** los cuatro.
- **BLOQUEO OWNER:** mismo stage da 403 al `CEREBRO_E2E_USER_JWT`. [Diagnóstico real 44330328085](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44330328085) confirma mediante su campo `exp` que el JWT guardado caducó y Supabase Auth devuelve rechazo 403. No se ha leído ni impreso su contenido. La cuenta técnica `cerebro-e2e@fenixcapital.es` sí genera JWT nuevos automáticamente pero **no tiene derecho de propietario**; nunca sustituirla por la cuenta owner.
- Alias `app.fenixcapital.es` permanece en `dpl_HfPBticPdGX2fjhyqvvQrbYT8E4e` (controlado tras el stage), ninguna promoción ni DNS.

## Qué falta, sin rehacer

1. Renovar de modo seguro el secreto de prueba *propietario* `CEREBRO_E2E_USER_JWT` (no cambiar duración JWT global). Hasta entonces el gate owner no pasa. Una futura solución estructural puede usar un comprobador owner de lectura con identidad de ejecución de privilegios mínimos, sujeto a seguridad.
2. Repetir E2E positive owner contra deployment exacto privado, comprobando `mode=summary`, `mode=profiles`, `total_profiles=2506`, padres/familias intactos. Workflow de verificación fijado a `a25o9g4yb`: `.github/workflows/cerebro-shared-state-verify-pinned-stage.yml`.
3. Verificar la salud funcional de CRM, dependencias, recuperación y todos los checks de PR #79. **No promover** antes de todo VERDE.
4. Adaptar una vez por fuente/runtime la emisión de `profile_key` + eventos verificables; **no** editar manualmente 2506 fichas. Hoy la actividad de GitHub entrega `engine_id` y actividad, pero generalmente no `profile_key`. Por tanto la mayor parte sigue `POR_VERIFICAR` y nunca debe fabricarse actividad.
5. Registrar la semántica `PERFECTO` solo cuando Tribunal GREEN, tests y rollback estén acreditados por el mismo evento del ejecutor. Sin ello `PARCIAL`.

## Rollback

PROD sigue intacta, por tanto no se necesita rollback. En cualquier promoción futura, baseline `dpl_HfPBticPdGX2fjhyqvvQrbYT8E4e` reservado. El fallback local mantiene la lectura antigua `/api/cerebro-agent-directory`, el feed `cerebro-console-activity-v0` permanece sin cambios. Reasignar alias únicamente con comprobaciones físicas y consentimiento de la política de CEREBRO.

**Coste adicional de suscripciones: 0 €; uso ordinario de despliegues Vercel existente.**

## Verificación de candidato actualizado · 18/11/2026

- QA con **32 departamentos SEO + 48 Productora**, y 618 adscripciones explícitas: [GitHub run 44339765015](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44339765015) SUCCESS y [run 44340332674](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44340332674) SUCCESS.
- Candidato de **código exacto 06e5893d...** READY, protegido y aislado: Vercel `dpl_5qs5BwJt1FAExuPgJe6z5KBzaUqw`, URL `https://fenix-capital-preprod-kimtw29gj.vercel.app`, **0 aliases**, no PROD. [Stage run 44340332713](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44340332713): acceso anónimo 401, tenant externo 400, POST 405 y cuenta técnica 403: PASS. **Owner +403 por JWT caducado, NO-GO de promoción**.
- El workflow `cerebro-shared-state-verify-pinned-stage.yml` se fija a este candidato y queda en `workflow_dispatch` explícito para que no se repitan pruebas que dependen de una credencial humana caducada y consuman créditos inútilmente. Cuando el secreto owner se refresque, ejecutar el workflow y verificar sus resultados antes de promover.
- GitHub Enterprise load 50-job aislada se recuperó satisfactoriamente por reintento del job fallido, sin tocar la prueba ni el runtime.
- **Ningún cambio en `app.fenixcapital.es`, CRM, DNS, Supabase Auth, main, PR #76/#77 ni servicios de pago.** El alias PROD permanece `dpl_HfPBticPdGX2fjhyqvvQrbYT8E4e` y el anterior despliegue `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` sigue registrado como alternativa de restauración.
