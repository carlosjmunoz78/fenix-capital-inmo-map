# CEREBRO OS · Skill Supply Chain · Step 5 Authorization

Fecha: 2026-10-07

## HECHO

El usuario autorizó explícitamente continuar con Step 5 después de que PREPROD alcanzara `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.

## Alcance autorizado

- Promoción gradual/canary mínima y reversible.
- Preservar baseline y rollback inmediato.
- No ampliar permisos en el mismo cambio.
- Coste adicional objetivo: 0 €.
- Sin datos PROD/cliente para la capability.
- Sin ejecución de código externo de skills.
- Sin writes PROD de la capability.
- Sin acceso Trading.
- Sin paid fallback.

## Límite operativo

La autorización humana satisface el gate `HIGH_RISK` para avanzar desde PREPROD a promoción gradual de la capability, pero no elimina los contratos técnicos fail-closed existentes. `RUNTIME-001 V0` continúa prohibiendo contexto PROD y los wrappers continúan `prod_authorized=false`; por tanto la primera promoción será un dark launch del código en `main`, sin activar tráfico/side effects de la capability.

El workflow `prod-live-deploy.yml` solo publica la App cuando existe confirmación `DEPLOY_PROD` o un commit con `[DEPLOY_PROD]`. El merge de Skill Supply Chain no utilizará esa marca.

Tras el merge, se exige PROD runtime smoke read-only y no se declarará activación live de la capability si el runtime/contratos siguen prohibiendo PROD.
