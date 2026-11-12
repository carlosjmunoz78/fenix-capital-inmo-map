# CEREBRO OS · OWNER UNIFIED ACCESS / OPERATIVA V37
Fecha: 2026-11-12
Estado: DEFINIDO (acceso global objetivo) / PARCIAL (enrutadores existentes) / POR AUDITAR (cobertura física de fuentes).

## Decisión del propietario
Todas las interfaces —Operativa web, JARVIS/voz, móvil, escritorio, futuras consolas— son **clientes del mismo CEREBRO OS**, no asistentes independientes con permisos/capacidades inventados o recortados. El propietario, autenticado y autorizado, debe poder **CONSULTAR, SABER y ORDENAR toda capacidad de todas sus empresas** desde cualquiera de ellas. Que una consulta no esté hoy conectada es un GAP técnico; nunca un límite artificial del producto.

**Importante:** "acceso global" significa alcance objetivo sobre las empresas, cuentas y recursos realmente propios/autorizados, con verificación de identidad, autorización y procedencia. No significa abrir endpoints anónimos, revelar secretos en respuestas, acceder a datos de terceros o eliminar gates legales, de seguridad o coste.

## Contrato de diseño
```
Operativa web ─┐
JARVIS / voz  ─┼─> CEREBRO Gateway [autenticación+identidad] -> [Owner Entitlements] -> [Company/Context Registry] -> [Knowledge+Source Router] -> [Motor/Action Orchestrator] -> [Policy] -> [Audit/Evidence] -> respuesta
Móvil/escritorio┘
```
- Identidad central: identidad del propietario verificada en servidor; `owner=true` solo por dato de confianza del backend, **nunca** por botón, rol declarado en el prompt, claims sin validar o parámetro `company_id` enviado por cliente.
- Alcance: `company_id`, `engine_id`, `environment`, `version` más identidad autorizada. `company_id` selecciona contexto, no concede acceso. Denegar por defecto cruce de tenants no vinculados.
- Consulta: todas las fuentes empresariales autorizadas, también las que solo se incorporen más adelante. Los adaptadores explican `CONNECTED_VERIFIED`, `PARTIAL`, `NOT_CONNECTED`, `ACCESS_DENIED` o `SOURCE_UNAVAILABLE`, con `observed_at`, fuente y estado de frescura; no inventar resultados.
- Orden: cualquier motor/acción entra por **el mismo Gateway/Orchestrator**, no por accesos directos desde cada UI a Supabase, WordPress, Cloudflare, GitHub, APIs de modelos, etc. `proposal` != `execution`. Usar contratos de operación, verificación de permisos, idempotencia, límites de coste, eventos y rollback.
- Human-by-exception para `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`. El trabajo ordinario ya autorizado no requiere permisos repetidos.
- Secretos: vault/referencias y privilegio mínimo por herramienta. La capacidad de usar una credencial autorizada **no** equivale a devolverla en texto ni a conceder scopes arbitrarios.
- Coste adicional: 0 € por defecto. Reutilizar adaptadores, conectores y runtimes existentes.

## Matriz mínima de cobertura prevista — NO confundir con acceso operativo confirmado
| Dominio | Consulta y evidencias | Acciones (mediante contrato) | Estado a 12/11 |
|---|---|---|---|
| App/CRM Fénix | expedientes, personas autorizadas, documentos, tareas, firmas, KPIs | acciones CRM específicas | PARCIAL; no cambiar contratos |
| CEREBRO / Engine Registry / FACT | motores, versiones, estado, colas, CI, fallos, coste | jobs y operaciones gobernadas | PARCIAL; observar antes de escribir |
| GitHub / despliegues | repos, PR, commits, acciones, gates | PR, CI, releases con rollback | POR AUDITAR por cada runtime |
| Supabase | metadatos/estado, base y funciones según permisos | cambios gobernados / migraciones | POR AUDITAR; PROD protegido |
| Cloudflare | Workers, D1, colas, observabilidad, cuotas | recursos aislados y cambios gobernados | POR AUDITAR |
| WordPress / SEO / GSC | páginas, indexación, analítica y fuentes SEO | contenido e infraestructura vía contratos | POR AUDITAR |
| Redes / marketing | calendario, publicaciones, métricas, contenidos | programar/publicar con gates | PARCIAL / según fuente |
| Notion / Drive / documentos | conocimiento, precedentes, archivos y versiones | edición auditada con consentimiento | POR AUDITAR |
| AION / CAPTACASA y empresas futuras | recursos vinculados bajo su company_id | motores por empresa | NO CONECTADO en Gateway v36 |
| Voz/JARVIS / otras UI | mismo Gateway, mismas capacidades por identidad | mismo Orchestrator y Policy | NO CONFIRMADO E2E |

## Contrato UI mínimo de una respuesta a pregunta/orden
```json
{
  "owner_scope": {"identity_verified": true, "company_id": "<de un registro autorizado>"},
  "capability": {"id": "...", "status": "CONNECTED_VERIFIED | PARTIAL | NOT_CONNECTED | ACCESS_DENIED | SOURCE_UNAVAILABLE"},
  "kind": "READ | PROPOSAL | EXECUTION",
  "executed": false,
  "evidence": {"source": "...", "observed_at": "...", "freshness": "..."},
  "next_action": "..."
}
```
Este es **contrato objetivo**, no declaración de que v36 ya emita ese JSON.

## Implementación de corto plazo, no romper lo existente
1. V37: corregir las respuestas cortadas y el falso "resumen" por copia literal, conservando Gateway v36 y sus autorizaciones. En rama y PR aislados; no desplegar sin QA.
2. Inventariar **solo gaps de conectividad real** de Gateway/Voice/UI, sin repetir auditorías corporativas terminadas. Registrar `capabilities` contra adaptadores existentes; mapa consulta/acción y nombres de permisos por motor.
3. Crear `Owner Access Resolver` central detrás de la autorización server-side actual; pruebas: owner autorizado, usuario normal, tenant aislado, fuente caída, ausencia de permisos, coste y rollback. **No** elevar privilegios de usuarios normales ni introducir Service Role en frontends.
4. Exponer desde un Gateway compartido consultas/órdenes disponibles; incorporar adaptadores de otros sistemas incrementalmente, en LAB/pruebas, comparando comportamiento OLD vs NEW y preservando contratos.
5. Conectar cada interfaz a esa misma capa, validando permisos, estado de ejecución, historial, voz y continuidad tras recarga. **No** declarar memoria persistente sin ensayo real.
6. Promover a PROD solamente por gates (backup, CI, E2E, permisos, auditoría, rollback y coste). Mantener JARVIS/CRM/APP/Trading LAB protegidos hasta entonces.

## Criterios de aceptación físicos
- Misma orden, autenticada como propietario, funciona con la misma semántica y trazabilidad por web/JARVIS/móvil cuando estén conectados; si falla un canal, error preciso y **sin inventar**.
- Ningún usuario no autorizado ve información, acciones ni secretos de otra compañía.
- Consultas generales de owner no quedan reducidas por diseño a 4 frases fijas; si falta un adaptador, indicar qué falta y cuál sería el siguiente bloque de integración.
- No se ha realizado ningún cambio en App/CRM, DNS, Workers ni otra empresa por definir este contrato.
- Respuesta de "explicar más sencillo" es semánticamente más breve y nunca se corta a mitad de una palabra.

## Rollback
Gateway PROD v36 no se ha modificado por esta rama; respaldos exactos v35 constan en `cerebro/rollback/gateway-v35-20261112`. Para futuras implementaciones cada adaptador deberá tener rollback propio, baseline y comparar OLD vs NEW.

## Estado y next_block
HECHO: PR #56 DRAFT, parche de simplificación v37, contrato Owner Unified Access y prueba aislada sobre código exacto GitHub: **8/8 PASS**.
HECHO: LAB existente `cerebro-console-gateway-v36-followups-lab` actualizado a **versión 4 ACTIVE** con los cuatro archivos v37 exactos (comparación física GitHub vs Supabase: **4/4**); ninguna función adicional creada.
HECHO: PROD `cerebro-console-gateway-v0` sigue en **v36 ACTIVE**, y mantiene exactamente los archivos v36. **No** se ha promocionado v37 a PROD.
HECHO: GitHub Actions QA v37 run [43276664670](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43276664670) **SUCCESS**, incluidos pasos `Existing v35 and v36 regressions` y `Owner follow-up v37 - true simplification and security regression`.
HECHO: lectura no mutante de la pestaña Operativa real en Opera: la respuesta antigua acaba exactamente en `Pue`, coincidiendo con el código v36 que aplicaba `slice(0,400)`.
POR VERIFICAR: HTTP E2E autenticado owner-only con v37, prueba en navegador contra v37 (Opera sigue usando PROD v36), memoria tras recarga y revisión final de seguridad/coste antes de promoción. El intento HTTP directo desde el canal de consulta no fue accesible.
NEXT_BLOCK: CI/HTTP E2E v37 LAB -> verificar memoria y UI reales -> inventario de conectividad (sin repetir auditorías terminadas) -> resolver owner multiempresa -> promoción solo con gates.

## ESTADO VIVO POSTERIOR · OWNER_ACCESS_RESOLVER_V0 · 12/11/2026
**Estado real:** PARCIAL / LAB. No reemplaza el registro histórico anterior.

**HECHO / verificable:**
- En el mismo Gateway se añadió ruta estrictamente GET `/owner-capabilities`, siempre posterior a `withSupabase({auth:"user"})` + `authorizedOwner(req)`. La identidad `CARLOS-ADMIN` solo se deriva del backend; ningún selector ni prompt la inventa.
- `cerebro/ops/gateway-v36-followups/owner_access.ts` declara 10 capacidades con estado concreto: rutas reales, adaptadores presentes no validados extremo a extremo, fuentes condicionales, propuestas gobernadas y router global no conectado. Solo metadatos, ninguna lectura de expedientes/secreto.
- Fénix se admite como contexto de inventario. Otros `company_id` retornan `NOT_CONNECTED`, sin información cruzada ni grants.
- Regresiones v35/v36, interpretación natural v37 y pruebas de aislamiento Owner Access Resolver pasaron en [run 43278801311](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43278801311) (pasos individuales SUCCESS).
- Desplegado **únicamente LAB existente** `cerebro-console-gateway-v36-followups-lab` **v5 ACTIVE**, cinco archivos iguales a GitHub; el gateway PROD `cerebro-console-gateway-v0` continúa en **v36 ACTIVE**. Sin nuevas funciones, gastos, migraciones ni cambios App/CRM/voz.
- En Opera, acceso a GET `/owner-capabilities?company_id=fenix` sin cabecera de usuario devolvió `MISSING_CREDENTIALS` (fail closed).

**BLOQUEADO / causa concreta**:
- La prueba E2E de GitHub Actions usó `CEREBRO_E2E_USER_JWT` ya configurado, sin revelar su valor y con alcance solo al LAB; respondió `401` y el código `INVALID_JWT`.
- `INVALID_JWT` confirma que la credencial no sirve para la llamada actual; **no demuestra por sí solo si caducó, fue revocada o era de otro entorno**. No desactivar `withSupabase`, no relajar owner-only, no introducir service-role en browser ni manipular firmas.
- Debido al fallo de E2E autenticado, **el conjunto no está certificado GREEN y v37 no se promociona a PROD**. No llamar al error "test verde".

**ROLLBACK LAB probado documentalmente / por ejecutar si falla el nuevo cambio**:
- Fuente exacta v37 anterior en Git commit `0fd88c9689e6ba2e667d8f0ec5e3879897e6fd06`, con `index.ts`, `knowledge.ts`, `conversation_intents.ts`, `activity_reader.ts`, sin `owner_access.ts`. Re-desplegar esos cuatro archivos sobre el **mismo LAB** con `verify_jwt=false` y comprobar coincidencia/owner guard; PROD no necesita rollback porque no se ha modificado.
- La historia de v35 y v36 sigue en PR #55.

**NEXT_BLOCK ÚNICO**: recuperar un JWT válido **mediante una sesión autorizada** y actualizar la referencia cifrada `CEREBRO_E2E_USER_JWT` sin mostrarla; repetir la llamada autenticada LAB (Fénix 200/scope limitado, AION `NOT_CONNECTED`, anónimo denegado), E2E Opera y comparación OLD vs NEW. Solo entonces valorar promoción. La fase siguiente será conectar por contratos el Owner Resolver con el verdadero Company Registry/Engine Registry y el mismo Gateway desde JARVIS/otras interfaces.

**Objetivo que sigue vigente:** todas las interfaces sirven al CEREBRO completo, con máxima autoridad real del propietario sobre sus empresas, pero sin afirmar que todos los adaptadores estén ya operativos.


## Anexo de continuidad · Empresas + proyectos actuales y futuros · 12/11/2026

**Mandato del propietario confirmado:** no existen "interfaces limitadas" por producto, empresa o proyecto. Operativa, JARVIS, móvil, desktop y cualquier canal futuro deben utilizar el mismo Gateway/Orchestrator, Company Registry, Project Registry, Engine Registry y Policy/Identity para **saber, ver y ordenar cualquier capacidad autorizada de todos los proyectos y empresas actuales y futuros**. Una interfaz no concede por sí sola permiso nuevo; la identidad validada en backend determina los alcances. Una conexión pendiente es un gap técnico, no una decisión de excluirla.

**Evidencia read-only de Supabase `fenix-capital-prod`:**
- EXISTENTE: tabla `public.cerebro_company_registry_preprod`, funciones `cerebro_company_registry_get_preprod`, `cerebro_company_register_preprod` y `cerebro_company_tenant_boundary_check_preprod`. **El registro PREPROD consultado contiene 0 filas**, por lo que no es un inventario completo de las empresas reales y no debe usarse para afirmar que AION/CAPTACASA están conectadas.
- EXISTENTE: `public.jarvis_project_overlay_v1`, con `company_id`, `project_id`, `environment`, `version`, además de estado y jerarquía de subproyectos. La consulta agrupada mostró **1 registro asociado a `fenix`**. No equivale a cobertura completa de todos los proyectos de la organización.
- La RPC `cerebro_company_registry_get_preprod` es `SECURITY DEFINER` y retorna un registro PREPROD individual; no se asumirá que autentica al propietario ni que autoriza PROD. Integrar solo detrás de owner auth con comprobaciones de permisos y seguridad específicas.

**NUEVO / DEFINIDO EN CÓDIGO, NO RUNTIME:**
- `cerebro/ops/gateway-v36-followups/owner_scope_registry.ts`: parser/selector determinista de compañías y proyectos **provenientes de una fuente del servidor validada** (no del frontend). No contiene lista fija de nombres. Si mañana se registra una nueva empresa/proyecto y el Gateway recibe los registros autenticados, se descubre sin reescribir la interfaz.
- `tests/cerebro-owner-scope-registry.test.mjs`: pruebas sobre fixtures de tres empresas, proyectos por compañía, aislamiento cross-tenant, rechazo de registros no verificados y filtrado de identificadores inválidos.
- No está incorporado todavía al endpoint LAB `/owner-capabilities`; ese endpoint sigue limitado al inventario explícito de los adaptadores de Fénix y preserva todas sus protecciones. No promoverlo a PROD sin pruebas.

**Bloqueo real que NO afecta a la disponibilidad general de los conectores:** `CEREBRO_E2E_USER_JWT` cifrado en GitHub Actions produce `INVALID_JWT` 401. No implica que el conector GitHub/Supabase entero esté caído. Renovar únicamente mediante sesión autenticada autorizada y actualizar secreto de GitHub por canal seguro; jamás copiar token/contraseña al chat ni desactivar el control.

**Plan de cierre:**
1. Resolver solo el JWT E2E, manteniendo v36 PROD intacto.
2. Vincular Company Registry y Project Registry con lectura server-side, registrar fuente/frescura, **sin** convertir el registro PREPROD en permiso PROD.
3. Añadir registro de adaptadores/acciones por fuente y empresa: `CONNECTED_VERIFIED`, `PARTIAL`, `NOT_CONNECTED`, `HUMAN_REQUIRED`, evidencias y coste.
4. Llevar el mismo acceso/órdenes a Operativa y JARVIS/voz/móvil a través de un único Gateway, con tests de identidad, aislamiento y OLD vs NEW. Proyectos y empresas nuevos se incorporan mediante registro, no hardcode.
5. E2E autenticado, regresiones, backup/rollback, PREPROD y promoción gradual. Sin reescribir App/CRM ni dar acceso público.

**Situación actual:** HECHO = inspección de registros existentes + módulo de descubrimiento dinámico y tests en PR #56; POR VERIFICAR = CI nuevo, conexión de registros a runtime, login E2E y pruebas de todas las interfaces; PROD permanece v36.
