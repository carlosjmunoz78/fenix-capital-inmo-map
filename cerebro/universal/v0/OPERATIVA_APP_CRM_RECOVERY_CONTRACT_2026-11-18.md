# CEREBRO OS · OPERATIVA · Contrato de recuperación App/CRM · 2026-11-18

**Estado:** DEFINIDO + QA AUTOMÁTICA EN RAMA AISLADA. `PROD_PROMOTION=HOLD`. Este documento NO autoriza un merge, cambio de dominio, escritura a Supabase, cambio de plan ni promoción.

## 1. Identidades de origen, inmutables

| Elemento | Referencia |
|---|---|
| GitHub | `carlosjmunoz78/fenix-capital-inmo-map` |
| App real | `https://app.fenixcapital.es` |
| Vercel project PROD | `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV` |
| Vercel team | `team_qnh6u1Ofy2WPp0MGEKlyMA50` |
| Baseline PROD | `a51dd14eac11f02424dce5db426346b041c1824f` |
| Baseline deployment | `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ` |
| PR #75 DRAFT source | `7163dccd962a19fbd5301b14fcacacf08b7245ea` |
| Candidata stage sin alias | `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` |
| Candidata privada | `https://fenix-capital-preprod-ijpkwq7fa.vercel.app` |
| LAB rollback independiente | `prj_s7h85hckKPNouow2xin9BFzwS6jn` |
| LAB rollback GitHub workflow | `44206552874` · SUCCESS |
| Rama de este contrato | `cerebro/operativa-app-crm-recovery-gates-20261118` |

**Contrato de base:** HEAD de PR #75 posee 14 rutas de diferencia respecto al deployment real. `main` no equivale al deployment activo. No utilizar `main` para inferir capacidad de rollback de App/CRM.

## 2. Frontera de datos y dependencias

Este release NO modifica ni migra tablas, funciones, políticas, usuarios, Auth, JWT, bases, Vault ni Storage de Supabase; no cambia DNS, `vercel.json`, `src/App.tsx`, `src/supabase.ts`, `src/CerebroConsoleHost.tsx` o el bloqueo de rutas existentes.

El mapa histórico de 05/09/2026 identificaba operaciones críticas en `fenix_prod`: actores, clientes, expedientes, bancos, tareas, documentos/versiones, tasaciones, firmas, inmobiliarias y comunicaciones. **El mapa de septiembre NO demuestra el estado actual de esas tablas.** No es necesario copiarlas para demostrar reversión de esta modificación de frontend + lectura de registro.

Consumidores protegidos en el código actual:
- App/Vite: `/inicio`, `/expedientes`, `/bancos`, `/contactos`, `/inmobiliarias`, `/tasaciones`, `/firmas`, `/documentacion`.
- Identidad: `fenix-app-gateway/session/context`, `/navigation` y Supabase Auth.
- Consola: `CerebroConsoleHost`, `CerebroOperativeConsole`, `CerebroOperativeCockpitV3Bridge`.
- Nuevo directorio: `GET /api/cerebro-agent-directory`, filtro estricto `company_id=fenix`, `CARLOS-ADMIN` verificado en Gateway, `executed:false`, `read_only:true`; deniega escrituras y otras empresas. Los 2.506 registros son **perfiles definidos, NO agentes en ejecución**.

## 3. Evidencia de recuperación por capas

1. **Capa de código, pruebas automatizadas:** `operativa-app-crm-recovery-check.mjs` compara el árbol completo con baseline fijo, no admite más que las 14 modificaciones originales + 3 archivos de QA. Debe acreditar byte a byte que los 11 archivos App/CRM/Auth y dependencias protegidas siguen intactos y que el HEAD de QA no cambia un byte del runtime ya probado.
2. **Capa de contrato funcional:** ejecutar TypeScript/Vite build, prueba existente `operativa-owner-directory-minimal.acceptance.mjs` y el nuevo test. No enviar solicitudes a App/CRM/Supabase PROD desde el job.
3. **Capa de despliegue:** stage original `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` READY sin alias; propietario autenticado en su URL exacta y directorio 1–25/2506 verificado en Opera, negativa anónima comprobada.
4. **Capa de rollback de plataforma:** `vercel rollback` nativo **PASÓ** exclusivamente en LAB sintético aislado (run `44206552874`), tras apuntar el alias a B y restaurar A. No equivale a rollback probado de App/CRM real.
5. **Capa App/CRM completa:** **NO EJECUTADA**. Sigue pendiente validar manualmente rutas transaccionales/roles de Fénix y ensayar recuperación con el runtime de App bajo protección equivalente, sin datos reales ni escrituras. No afirmar que un build o mock suple esas pruebas.

## 4. Política de promoción/reversión, sin ejecutar

**Preflight estricto:** deployment source SHA exacto, Vercel project/team, plan comercial aplicable, DRAFT / alcance aprobado, ausencia de schema migrations, JWT owner válido y URL protegida. Snapshot de alias PROD, SHA del baseline, evidencia del login OLD y NEW, plan de observabilidad, logs, límites de coste y HUMAN_REQUIRED si hay riesgo no cubierto.

**Promoción propuesta (futura, no ejecutada):**
- Congelar el commit; comprobar contrato y despliegue; confirmar autorización humana de publicación real.
- No mezclar el PR #66 ni `main` divergente; no tocar CRM ni Supabase.
- Solo cuando todos los gates estén VERDE, transferir tráfico según plan de despliegue gradual y vigilar login, navegación, lecturas, errores, latencia y costes.
- Revertir inmediatamente al baseline `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ` si falla login, identidad, navegación, listado, seguridad o coste.

**Rollback, solo después de autorización de promoción:** verificar ID exacto del proyecto `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`, alcance del alias y deployment de recuperación; utilizar vía nativa o redepliegue de baseline, según contrato y plan. Tras restaurar, comparar rutas y sesión, y comprobar que CRM y datos no se han mutado. No usar un alias público temporal como primer ensayo.

## 5. Legal y coste · no saltar el gate

En la consola conectada el equipo actual figura como **Hobby**. La documentación y las condiciones de Vercel (19/10/2026) restringen Hobby a uso personal **no comercial**:
- https://vercel.com/legal/terms
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/docs/plans/hobby

**`HUMAN_REQUIRED: LEGAL_REQUIRED / MONEY_LIMIT`** antes de publicar una modificación comercial bajo un plan que no consta como apto. No contratar automáticamente Pro ni cambiar de proveedor. Primero confirmar si existe hosting comercial ya contratado (p. ej., infraestructura propia/Hostinger o cuenta Pro real) y analizar equivalencia de funciones, rutas, seguridad, rollback y coste antes de cualquier migración. La consulta de facturación API no entregó un importe marginal válido; **0 € de coste comprobado = NO**. No se autorizan suscripciones.

## 6. Resultado / aceptación

| Comprobación | Estado al crear |
|---|---|
| Inventario de cambios frente a SHA PROD | HECHO |
| E2E visual propietario stage exacto | HECHO |
| CI PR #75 sobre SHA deployed | HECHO · 3/3 SUCCESS |
| Rollback nativo LAB aislado | HECHO |
| Recuperación contractual de App/CRM por comparación binaria de fuentes | POR EJECUTAR en QA |
| App/CRM E2E transaccional y rollback con runtime real aislado | PENDIENTE |
| Hosting comercial y coste facturado | HUMAN_REQUIRED |
| Producción | CONSERVADA · `PROD_PROMOTION=HOLD` |

**Regla:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. No hay autorización de merge/promote.
