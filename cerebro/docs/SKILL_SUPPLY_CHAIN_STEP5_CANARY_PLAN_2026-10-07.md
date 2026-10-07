# CEREBRO OS · Skill Supply Chain · Step 5 Canary Plan

Fecha: 2026-10-07

## Estrategia

La primera promoción es un **dark launch reversible** del código de Skill Supply Chain a `main`.

No se activa tráfico live de la capability y no se toca la App Fénix.

## Motivo

- `RUNTIME-001 V0` rechaza cualquier contexto distinto de `PREPROD`.
- Los wrappers `skill-cerebro-supabase-wrapper` y `skill-cerebro-agent-browser-wrapper` mantienen `prod_authorized=false`.
- Forzar activación live ahora violaría el contrato vigente y el principio CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## Canary mínimo

1. Merge exacto del PR #486 a `main` sin marca `[DEPLOY_PROD]`.
2. No ejecutar `prod-live-deploy.yml`.
3. Permitir únicamente los checks/read-only smoke que `main` ya ejecuta.
4. Verificar que la App y Gateway PROD existentes siguen GREEN y fail-closed.
5. Mantener bindings de Skill Supply Chain deshabilitados para tráfico PROD.
6. Rollback inmediato = revert del merge si aparece regresión en CI/smoke.

## Condiciones de éxito

- Merge exacto del head autorizado.
- No deployment de la App.
- PROD runtime smoke read-only GREEN.
- No datos cliente, no writes PROD, no código externo de skill, no Trading, coste 0 € para la capability.
- Capability presente en `main` pero live binding deshabilitado.

## Siguiente gate

Construir/promover un runtime de canary PROD explícito y separado solo si se decide activar tráfico real de la capability. No modificar `RUNTIME-001 V0` en caliente ni relajar `prod_authorized=false` sin contrato/tests/rollback propios.
