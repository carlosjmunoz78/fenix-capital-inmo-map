# ZEUS / JARVIS B10 · CORTE 03 · Evidencias externas de solo lectura (2026-11-04)

**Estado: PARCIAL · LAB GREEN · PROD NO_GO.** PR #20 DRAFT sobre PR #19 B9 DRAFT, sin merge. `main`, App, CRM, Supabase PROD, WordPress, SEO y Trading sin cambios.

## Hallazgos reales, fuente y límites
1. Supabase `fenix-capital-prod` (`cluhljgonannaafpmblx`) es **ACTIVE_HEALTHY** según el panel/control plane; esto no demuestra que JARVIS responda correctamente a misiones.
2. Supabase listó **95 Edge Functions**. `fenix-app-gateway` v22, `cerebro-console-gateway-v0` v33, `jarvis-work-dispatch-v1` v1, `jarvis-git-dispatch-v1` v1, `jarvis-work-gateway-v1` v3, `jarvis-git-gateway-v1` v2 y `jarvis-orchestrator-v0` v2 muestran **ACTIVE**. Es **deployed-status evidence**, nunca health autenticado ni autorización funcional.
3. SQL SELECT read-only: B3 y B4 para `fenix/PROD` = `enabled=false`, `kill_switch=true`. La autonomía permanece inactiva. **No se han activado**.
4. `public.cerebro_company_registry_preprod` contiene **0 registros**; no es prueba de que no existan empresas en otros registros. Proyecto `PRJ-SUPERAGENT-001` existe con estado `PARCIAL` y **70** referencias de auditoría a fecha de lectura; no se ha duplicado ni actualizado.
5. GitHub: `main` SHA `3f06b8bbe92a12572329b05a27d1243335c2756f`; `prod-preparation` SHA `b2d8347845850d26b51194cfaa8092b4cdf81ba1`. El fichero `PROD_SOURCE_SHA.txt` no existe en raíz de esas dos ramas; ello **no demuestra ausencia del marcador en el artefacto desplegado**.
6. No hubo respuesta usable del sitio `app.fenixcapital.es` ni del Gateway health desde las herramientas de red disponibles: web no pudo abrirlos y contenedor sin resolución DNS. No inventar HTTP 200 ni fuente PROD.
7. El navegador conectado exige el contexto Chrome original; dos conexiones Opera listadas no respondieron antes de 30 s. **No se ejecutó prueba física PC + móvil**. No se volvió a intentar en loop.

## Código y tests de corte 03
`zeus/jarvis/core/jarvis-b10-external-read-reconciler.mjs` y `.test.mjs` nuevos. Reutiliza `assessJarvisB10Certification`. Normaliza observaciones control plane `REAL_EXTERNAL_READ` sin crear nunca `PROD_OPERATION_VERIFIED`, rechaza doble uso, origen inválido, ámbito cruzado, secretos en metadatos, fechas caducadas/futuras e intentos de presentar despliegue `ACTIVE` como una operación certificada.

CI código HEAD `e7ebb25a7f83ace1557ba67123dd161fdf198be2`: **508/508 PASS, 0 FAIL, 0 SKIP** en https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41799171359. B7 https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41799171394 y Governed https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41799171383 también SUCCESS. Son pruebas LAB, **no operaciones PROD**.

## Clasificación y puertas abiertas
- **HECHO:** inventario remoto read-only de control-plane, estado de controles PROD y branch, reconciliación y pruebas adversarias.
- **EXISTENTE:** 95 Edge Functions (status informativo), proyecto ya registrado y 179 motores originales conservados.
- **PARCIAL:** B10 CUT01–CUT03, 508 tests green y control-plane leído, sin certificación PROD.
- **POR AUDITAR:** gateway health real, SHA servida, OWNER_ROOT y B3 reales, memoria B4 multi-dispositivo, JOB-001 live, B8/B9 real, permisos y revocación, P23/FinOps/tribunal real, restore y dos empresas.
- **HUMAN_REQUIRED cuando corresponda:** dos dispositivos reales con login/segundo factor, firma/obligación legal y activaciones que excedan autorización existente.
- **PROD_OPERATION_VERIFIED:** 0 pruebas atribuibles a este bloque.

## No invasivo y rollback
No se han creado servidores, tablas, suscripciones, modelos de pago ni motores nuevos. Sin mezcla con Trading. Gastos efectivos de GitHub Actions no conciliados. Rollback = cerrar/revertir solo PR20 (sin merge), conservando todas sus dependencias PR19/18/17/16, `main` y producción.

**Siguiente:** CUT04 recabar evidencias de despliegue y autorización reales con herramienta legítima de solo lectura, y ejecutar la prueba física OWNER_ROOT de dos dispositivos cuando exista acceso al navegador/dispositivos. Hasta entonces, **NO_GO**.
