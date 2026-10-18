# CEREBRO GLOBAL OPERATIONAL CONVERGENCE V4 · RUNBOOK

Fecha: 2026-10-18  
Owner lógico: `FACT-001`  
Entorno: `PREPROD`  
Coste adicional: `0 €`

## Objetivo

Mantener un único resumen operativo actual de CEREBRO sin reescribir la historia y sin confundir:

1. adopción semántica/runtime probada;
2. evidencia física de fuentes, adaptadores o dispositivos;
3. autoridad de PROD o de efectos externos.

La regla sigue siendo `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## HECHO

- Registry canónico: `179` motores lógicos.
- Catálogo de rollout: `184/184` capacidades normalizadas; deuda de normalización `0`.
- Los diez perfiles canónicos de ingeniería permanecen dentro del perfil transversal seguro; no se crea un servidor por profesión.
- COMPET, CAP, LEAD, SALE, COM/NOTIF/C360, Customer Journey y Mortgage Operations conservan sus cierres `FULL_E2E_REAL_PREPROD` donde ya estaban evidenciados.
- Las `5/5` skills admitidas siguen `FULL_SAFE_PREPROD`, con `10` bindings gobernados para la pareja antes HIGH_RISK.
- El write path servidor→WordPress de Universal QA/Core Guard sigue `GREEN_PHYSICAL_PREPROD` y no concede el journal B3 directo por inferencia.
- Watch & Learn tiene `3` ejecuciones `schedule` genuinas, separadas y GREEN, replay estable por ciclo y revisión de retención GREEN.
- COMPET conserva tres targets reales de Córdoba, baseline físico GET-only GREEN y `3` ejecuciones programadas genuinas GREEN.
- CAP conserva fuente oficial IECA Córdoba GET-only, discovery físico PREPROD GREEN y `3` ejecuciones programadas genuinas GREEN.
- Coste adicional: `0 €`.

## PARCIAL

- `ANDROID_48_183`: APK PREPROD firmada y STAGING verificados; falta instalación/attestation/render en dispositivo físico autorizado.
- `EVT74_GUARDED_SERVER_JOURNAL_BINDING`: núcleo local persistente y emisor autenticado STAGING están GREEN; el E2E directo hasta el journal protegido exige el grant mínimo PREPROD explícito. No se permite bypass de permisos.
- `IAM_BROWSER_VAULT_PHYSICAL`: las políticas existen, pero una atestación física fresca debe verificarse cuando haya runtime autorizado disponible.
- `MULTIMEDIA_PHYSICAL_BINDINGS`: la lógica está cerrada; el runner GitHub auditado no expone los binarios multimedia allowlisted y está prohibido instalarlos/descargarlos automáticamente. Puede auditarse en modo read-only otro runtime autorizado ya existente.
- Los efectos externos de telefonía, email/WhatsApp, CRM, calendario, firma, pagos, facturación, publicación, reseñas, gasto, precios y similares permanecen bajo sus gates exactos de política/legal/dinero.

## HUMAN_REQUIRED

### PR #731

`POLICY_CONFLICT`: vinculación de credencial GitHub de escritura al runtime gobernado de PROD. No se solicita ni comparte credencial en chat y V4 no concede autoridad PROD.

### PR #732 / EVT-74

`POLICY_CONFLICT`: adaptador exacto del journal B3 directo y grant mínimo PREPROD. Es distinto del write path genérico ya probado. La evidencia parcial no autoriza ampliar permisos.

## Regla de lectura

Usar `cerebro/registry/current-operational-convergence.v1.json` como puntero al resumen actual. V2/V3 siguen siendo evidencia histórica y no deben reescribirse para aparentar estados más verdes.

Usar además `cerebro/registry/current-physical-adapter-audit.v1.json` para el detalle físico actual; V1 del audit queda preservado como histórico y V2 reconcilia los cierres de Watch/COMPET/CAP.

## Validación

El workflow `CEREBRO Global Operational Convergence V4` debe comprobar como mínimo:

- `179` motores canónicos;
- `184` capacidades normalizadas y `all_184_physically_active=false`;
- registries estrictos actuales preservados;
- skills `5/5 FULL_SAFE_PREPROD` y `10` bindings gobernados;
- B3 genérico GREEN sin cerrar falsamente el journal B3 directo;
- Android físico todavía false;
- Watch & Learn `soak_complete=true`, `scheduled_soak_runs_verified=3` y retention review GREEN;
- COMPET `soak_complete=true` con `3` runs programados genuinos GREEN;
- CAP con fuente IECA oficial y `3` runs programados genuinos GREEN;
- Watch/COMPET/CAP fuera de la lista de gates físicos pendientes;
- EVT-74 journal directo presente como gate `POLICY_CONFLICT`;
- PROD, writes, provider side effects, customer data, gasto, Trading y ejecución de código externo denegados.

## Backup

V2/V3, los registries previos, el audit físico V1, el histórico de GitHub Actions y los artifacts de certificación permanecen intactos. V4 y el audit V2 son aditivos y no sustituyen App, CRM, Supabase, WordPress, SEO, Training ni Trading.

## Rollback

Revertir únicamente los cambios aditivos de V4/tests/runbook y, si procede, devolver el puntero de audit físico a V1. No existe rollback de datos de negocio porque esta reconciliación no muta recursos externos ni datos de clientes.

## Rebuild

1. Leer el registry canónico actual.
2. Preservar V2/V3 como histórico.
3. Leer registries estrictos actuales y evidencia de skills.
4. Leer Android, EVT-74, Browser/Vault y multimedia.
5. Leer Watch/COMPET/CAP y verificar sus tres runs `schedule` genuinos y artifacts.
6. Verificar los HUMAN_REQUIRED activos.
7. Generar estado únicamente con evidencia observada.
8. Ejecutar OLD-vs-NEW, regresión completa y gates de gobernanza antes de cualquier promoción.

## Changelog

`2026-10-18`: se certifican las tres ejecuciones programadas genuinas de Watch & Learn, COMPET y CAP; se cierra la revisión de retención de Watch; se eliminan esos tres gates obsoletos del mapa físico pendiente; se mantiene Android abierto y se explicita EVT-74 como `POLICY_CONFLICT` de grant mínimo, sin ampliar autoridad.

## Estado de autonomía

`PREPROD_GOVERNED / PROD_FALSE / TRADING_ISOLATED / ZERO_ADDITIONAL_COST`.
