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
