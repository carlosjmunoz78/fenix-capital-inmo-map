# Operativa Universal V0.4 · LAB · conectores rápidos

El protocolo único `createUniversalInterfaceAutoConnectV0` permite conectar *en LAB* clientes Operativa, JARVIS, Neuronal, Navegador, App y Móvil utilizando un **mismo SDK** y el Gateway común. No les concede acceso sin un token válido, entorno LAB y permisos emitidos por el servidor; ninguna interfaz se declara operativa por estar enumerada aquí.

## Fuente real que reutilizamos

`cerebro-console-activity-v0/` es una fuente **existente** de actividad GitHub Actions, consultada mediante `GET`, sesión existente y llave pública. Se expone como `list_work_activity` (NO como `list_jobs` de JOB-001). Informa `LIVE`, `CACHED` o `UNAVAILABLE`, conserva `origin_environment` y filtra empresa Fénix. No crea cola, no añade scheduler y no declara que los 179 motores definidos estén funcionando.

## Restricciones

- PROD/Trading/App/CRM/main/SEO/WordPress intactos; únicamente LAB Preview.
- La API autentica siempre al propietario desde `fenix-app-gateway/session/context`, luego consulta la fuente existente; nunca acepta un rol del frontend.
- El cliente muestra evidencia del origen y no representa `CACHED` como `LIVE`.
- Integrar **JARVIS/Neuronal/Móvil físicos**, **JOB-001 real** y **órdenes de ejecución** requiere contratos adicionales y pruebas por recurso. No certificarlos con esta versión.
- Zero suscripciones nuevas; puede haber uso de minutos de GitHub o Vercel dentro del plan existente.
- Rollback: no fusionar PR #66 y revertir este commit si falla, sin tocar producción.

## Recuperación cuando el feed existente está caducado (V0.5, 13/11/2026)

La fuente GitHub existente `cerebro-console-activity-v0` usa un snapshot que solo admite **20 minutos** de antigüedad cuando no hay token de GitHub configurado. En la comprobación de hoy, `activity.json` estaba generado el `2026-11-13T15:48:21Z` y tenía **80 minutos** de antigüedad. No ampliar ese TTL en PROD ni presentar información vieja como actual.

El LAB ahora ofrece **una única consulta GET a la API pública de GitHub**, únicamente si la fuente autenticada devuelve error, está inaccesible o falla la validación. Ruta fija al repositorio público, 30 workflows como máximo, **sin GitHub token**, sin ejecutar workflows, sin otra cola y sin modificar `main`. Indica `PUBLIC_GITHUB_REST_READ_ONLY_FALLBACK`, marca información de jobs y porcentajes como `UNAVAILABLE` y falla cerrado ante límites de peticiones o problemas de red.

Las pruebas unitarias emplean respuestas simuladas. El funcionamiento físico de esta recuperación en el Preview V0.5 con la sesión del propietario **no está acreditado todavía**. La pestaña actual de Opera debe permanecer donde está; no abrir nuevas pestañas ni navegar a un dominio distinto sin autorización explícita.
