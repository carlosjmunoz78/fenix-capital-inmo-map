# RECIBO FÍSICO · CEREBRO OPERATIVA · Vercel Preview rollback aislado · 2026-11-16

**HECHO: conmutación y restauración del alias privadas verificadas en Vercel, sin PROD.** Fuente: API Vercel conexión LAB específica + observación de pantalla en Opera. Este recibo NO certifica login autenticado, funciones API del Preview antiguo, ni promoción de PROD.

## Preflight físico
- Proyecto único `prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc` (`fenix-capital-preprod-app` - nombre histórico, **no App PREPROD**).
- Vercel SSO `enabled=true`, `deploymentType=all_except_custom_domains`.
- Alias único de Preview `fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app` (sin DNS personalizado).
- Alias ORIGINAL leído con `GET deployment by hostname`: `dpl_GUsDv7y88Vnf3ugBfurbmQM1DU8x` `READY`, `target=null`, SHA `986eed50a47dcf519d52dfbb0dfc2c12a3c2fee2`.
- Recuperación `dpl_4i9nQzAxgRY5GyDcftutkWmxzTfb`, `READY`, `target=null`, SHA `202e3264e0129c762c9172a71dd2d8403e8a31f6`, mismo proyecto.
- PR #66 `OPEN DRAFT UNMERGED`; HEAD antes de este recibo: `3d316183301a21863ab977bbfe063cc3f360b4e2`.

## Operación real reversible
1. `assign_alias` del hostname Preview al deployment anterior. API devolvió `oldDeploymentId=dpl_GUsDv7y88Vnf3ugBfurbmQM1DU8x`.
2. **READBACK REAL**: `get_deployment({idOrUrl:alias})` devolvió `dpl_4i9nQzAxgRY5GyDcftutkWmxzTfb`, `READY`, `target=null`.
3. **Opera GET de pantalla anterior vía ALIAS**: carga y muestra `Acceso seguro` Fénix. Sin autenticación manual; por tanto certificación de UI limitada a landing protegida.
4. `assign_alias` de restauración al ORIGINAL, API devolvió `oldDeploymentId=dpl_4i9nQzAxgRY5GyDcftutkWmxzTfb`.
5. **READBACK REAL**: `get_deployment(alias)` devolvió `dpl_GUsDv7y88Vnf3ugBfurbmQM1DU8x`, `READY`, `target=null`, SHA funcional esperado. Confirmación adicional tras el bloque: `get_project.latestDeployment.id` coincide con el ORIGINAL y SSO sigue enabled.
6. **Opera GET posterior a recuperación**: vuelve a cargar pantalla Fénix `Acceso seguro`, sin login ni lectura propietaria nueva.

## Conclusión / gates
- **VERDE — ROLLBACK DE ASIGNACIÓN DEL ALIAS PREVIEW**: ida, readback, vuelta y readback **físicamente probados**. No declarar rollback de código/Edge/base de datos, ni E2E autenticado OLD vs NEW, ni restauración de recursos PROD.
- **PENDIENTE**: E2E owner autenticado tras cada variante, pruebas negativas JWT expirado/revocado contra backend real, seguridad session_id, costes marginales medidos y tribunal.
- **SIN CAMBIOS**: App/CRM, Supabase PROD/Edge, main, DNS, Cloudflare, Instagram/Facebook, Trading LAB/REAL. El usuario no fue desconectado ni se generaron nuevas credenciales.
- **COSTE**: sin nuevas suscripciones; gasto por invocación Vercel/Opera/CI NO_MEDIDO.
- **PROD=HOLD**, control autónomo NO ACTIVADO.

## Procedimiento de restitución si se necesitase repetir (sólo LAB)
Guardar alias original exacto leyendo `get_deployment(alias)`; exigir SSO, mismo proyecto, READY/Preview, rama PR DRAFT y versión de recuperación. Ejecutar `assign_alias` sólo a esa versión; `get_deployment(alias)` para confirmar; repetir `assign_alias` al ID original y verificar idéntico ID, SHA y estado. Si un readback es distinto, detener promoción y clasificar SECURITY_INCIDENT/HIGH_RISK. Nunca usar la lista histórica de aliases como fuente del destino actual; el método fiable aquí fue `get_deployment` por hostname.
