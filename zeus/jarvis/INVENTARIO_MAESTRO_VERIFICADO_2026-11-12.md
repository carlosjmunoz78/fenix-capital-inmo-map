# CEREBRO OS · JARVIS SUPERAGENTE · INVENTARIO MAESTRO VERIFICADO
**Fecha de verificación:** 2026-11-12 · **Paso:** 1/12 · **Modo:** lectura externa y documentación aislada · **Entorno:** LAB · **PROD:** NO-GO

## Alcance, método y límites
Inventario de evidencias vivas GitHub (repo, main, PRs y CI), Supabase (Edge metadata y tablas de control), Cloudflare (Workers, deployments, binding metadata y Access), Google Drive, Notion y Vercel (accesos). NO se ejecutaron órdenes de negocio, escrituras en DB ni cambios de configuración de PROD. El estado ACTIVE de una función no equivale a E2E operativo. La existencia de política Access no demuestra su aplicación en una petición real. La matriz no atribuye ejecución real a un motor por aparecer en el Registry.

## 1. Inventario y trazabilidad física
| Sistema | Evidencia viva | Estado / observación |
|---|---|---|
| GitHub | `carlosjmunoz78/fenix-capital-inmo-map`, main `ab832c302e60d8fb1cb42969085aefaf4ca360fd` (2026-11-12) | Acceso admin disponible; NO fusionar código JARVIS desde ramas DRAFT |
| Núcleo identidad B2/B3 | PR #25 DRAFT, head `36a3967363fd48ef557f5d7541fd2b972e90a0ca` | CUT34 LAB, sintéticos; canary OWNER original CUT30 observado históricamente, sin B2 enroll |
| Malla CEREBRO | PR #34 DRAFT, head `cc1012dc5f9e46a47c74cc2892bb88c3ec576bd6` | `ROUTE-001` y `JOB-001` invocados en test in-process; no ejecución owner PROD |
| Integración candidata | PR #35 DRAFT, head auditado `02391c29d91c8553b221d10fbe1e7ad1cbcd1d8c` | CUT50/CUT51: B2+B3+ACTGW en LAB OFF; 759 tests Node históricos y 24/24 jobs documentados; NO merge |
| Voz/chat | PR #38 DRAFT, head `de62aa9d81049d61491e314b655a37a5316adcae` | E2E de propietario y síntesis JARVIS V2 pendientes; no desplegar |
| Historial consola | PR #40 DRAFT, head `1fd8f8c0f4b41b753e4d10383337ce04c77efd5c` | NON-PROD, no merge ni despliegue |
| Incidente relevante | PR #37 DRAFT y REVERTED | Prueba física voz/chat fallida; NO reutilizar despliegue rechazado |
| Supabase | `fenix-capital-prod`, `cluhljgonannaafpmblx` | 113 Edge Functions listadas; seis relacionadas directamente con JARVIS WORK/GIT y Gateway CEREBRO |
| Supabase Edge | `jarvis-work-dispatch-v1` v1, `jarvis-git-dispatch-v1` v1, `jarvis-git-gateway-v1` v2, `jarvis-work-gateway-v1` v3, `jarvis-orchestrator-v0` v2 | ACTIVE según metadata; NO acredita puente OWNER_ROOT/B3/E2E |
| Supabase Gateway | `cerebro-console-gateway-v0` v33 | ACTIVE, `verify_jwt=false` (requiere revisar auth interno, no inferir acceso anónimo) |
| Supabase B3 | `zeus_jarvis.b3_runtime_control` | `environment=PROD,enabled=false,kill_switch=true` en consulta viva |
| Supabase grants | `zeus_jarvis.b3_owner_grants` | 0 filas en consulta viva |
| Supabase B4 | `zeus_jarvis.b4_memory_control` / `b4_memory_event` | PROD `enabled=false,kill_switch=true`; 0 eventos |
| Binding B2 | `public.jarvis_zeus_identity_binding_v0` | Tabla NO encontrada en búsqueda de metadata; no asumir enlace físico |
| Supabase RLS | Las seis tablas `zeus_jarvis` consultadas | RLS habilitado; no prueba por sí sola que toda política sea correcta |
| Cloudflare | Cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e` | Dos Workers JARVIS: `cerebro-jarvis-lab-eu` (original CUT30), `cerebro-jarvis-cut32-lab-eu` (aislado) |
| Cloudflare CUT32 | Deploy activo versión `a0fda472-dbf2-4acc-abc3-7ad3e53d1175` | `JARVIS_ACCESS_PROBE_ENABLED`, `JARVIS_B2_DEVICE_ENABLED`, `JARVIS_B2_ENROLLMENT_ENABLED`, `JARVIS_B2_B3_LIVE_ENABLED`, `JARVIS_GATEWAY_ENABLED` = false; entorno LAB, binding D1 |
| Cloudflare Access CUT32 | app `f8772497-cd71-47ef-852f-bbeedcac7307`, policy `JARVIS-CUT33-OWNER-ONLY` | API 2026-11-12 devuelve destino `type=worker` con worker_id; contrasta con nota UI 2026-11-07 'sin destinos'. **ENFORCEMENT real NO PROBADO**; URL de test OFF |
| Cloudflare CUT30 | app Access Owner `c3fc44df-9c3f-4e00-ba31-72c620985206` | Preservar original; CUT51 anónimo 302 challenge histórico |
| Google Drive | carpeta `VOICE-001 · JARVIS 1 · MASTER Y BACKUP` | Documentos voz V2, continuidad y backups existentes; voz aprobada V2 más clara 1,10x, sintetizador dinámico no unido |
| Notion | página `JARVIS · Fénix Capital` | Guía histórica de Notion; no confundir agente del workspace con núcleo superagente ni sobrescribir reglas vigentes |
| Vercel | Conexión general devuelve 0 proyectos 'fenix'; conexión LAB muestra `fenix-capital-preprod` y `fenix-capital-preprod-app` | PROYECTO APP REAL / deployment actual SIN acceso verificable por esta conexión; no afirmar paridad |
| Browser | Browser read-only list_tabs | Sesión ChatGPT, Gmail y Cloudflare UMS visible; no hay sesión JARVIS Owner accesible para E2E desde esta conexión |

## 2. Matriz por bloques B1–B10
| Bloque | Contrato objetivo | Evidencia | Resultado |
|---|---|---|---|
| B1 | Inventario, gobernanza, trazabilidad | fuentes reales verificadas y STATE consolidado aquí | **HECHO documental con excepciones identificadas** |
| B2 | Owner identity / dos dispositivos / sesión / revocación | canary CUT30 OWNER histórico; código B2+D1 LAB | **PARCIAL / NO CERTIFICADO** |
| B3 | Policy, grants, vault y revocación | PR25/35, SQL PROD disabled, 0 grants | **PARCIAL; PROD OFF** |
| B4 | Memoria, correcciones, aprendizaje | LAB código; PROD disabled y 0 eventos | **PARCIAL** |
| B5 | Conversación, STT/TTS, Router | PR38 y Drive VOICE-001 | **PARCIAL; voz canónica NO CONECTADA** |
| B6 | Delegación ACTGW / ejecución / resultado | PR34/35, ROUTE+JOB test | **LAB PARCIAL, OWNER E2E NO** |
| B7 | Multiagente / supervisor | 11 perfiles registrados en PR34 | **LAB; roles/reporting/ejecutores reales pendientes** |
| B8 | Multiempresa | `company_id` y tests sintéticos | **LAB; 2 empresas físicas E2E pendientes** |
| B9 | Recuperación, seguridad y tribunal | pruebas y documentación acumuladas | **LAB; rollback físico/tribunal final pendientes** |
| B10 | Certificación y promoción | PR20 DRAFT, CI histórico verde | **PROD NO-GO** |

## 3. Divergencias y dependencias (no inventar resolución)
1. **Registry**: PR34 documenta 179 motores + 11 perfiles; archivo `cerebro/registry/skill-dynamic-adoption-v1.json` de main 2026-11-12 muestra summary total=177. No asumir conteo actual canónico sin cotejar definición y release; un ID registrado NO equivale a ejecutor certificado.
2. **PRs**: PR25 seguridad, PR34 delegación, PR35 integradora están abiertas y tienen bases diversas; no fusionar por numeración ni cherry-pick ciego. PR35 CUT50 es candidato técnico y requiere comparación/QA actual.
3. **Access**: divergencia UI histórica / API actual sobre destino de CUT32; la API ahora muestra binding de destino pero hace falta identidad, challenge anónimo, denegación no-owner y E2E; mantener sin rutas públicas hasta completar.
4. **Cloudflare CUT32 vs Git**: se verificó posteriormente coincidencia exacta de **7/7 archivos de código fuente** del deploy `a0fda472...` con la rama candidata PR25; tras añadir secretos en LAB, la revisión de sourcemap comprobó que sus siete fuentes permanecían inalteradas. La equivalencia de código no sustituye un E2E de Access.
5. **PROD**: Gateway legacy y funciones ACTIVE; no se demuestra OWNER_ROOT ligado a B3 ni a `jarvis-orchestrator-v0`. Conservar actor y callbacks previos hasta paridad.
6. **Vercel**: falta evidencia autorizada del proyecto de App real y despliegue actual.
7. **Voz**: PR37 fracaso físico y revertida; PR38 aún LAB. Voz temporal no debe confundirse con JARVIS V2.
8. **Plan 420 requisitos**: mencionado en PR35, matriz completa y fuente documental de esos 420 no auditadas; no certificar cobertura.
9. **Coste**: no se contrataron nuevos servicios en este inventario; cuota exacta/minutos Actions y consumo total de Cloudflare sin reconciliar.

## 4. Contrato actual y mapa de dependencias
```
User PC/Mobile/Tablet
   -> App/Console authenticated session (Vercel: project real por verificar)
   -> CEREBRO Console Gateway (Supabase v33; legacy auth)
   -> B2 owner/device/session + Cloudflare Access CUT30/CUT32 (CUT32 OFF)
   -> B3 policy/grant + credential references (PROD OFF; 0 grants)
   -> ACTGW-001 / JARVIS command-mesh (PR34/35 LAB)
   -> ROUTE-001 / JOB-001 & eventually certified engine runners
   -> Evidence/Audit/Memory/Supervisor (B4 PROD OFF; B7-10 unverified)
```
Interfaces ANA fuera de las superficies CEREBRO, CRM real y Trading LAB aislado NO deben alterarse. Todo motor multiempresa conserva `company_id`, `engine_id`, `environment`, `version`.

## 5. Plan seguro para PASO 2 (B2)
**Primero** cotejar metadata deploy CUT32 con fuente de PR25/35 y verificar política Access sobre destino sin permitir salida pública. **Después** realizar E2E de challenge de Access con una ruta de prueba limitada, solamente si está protegida; no usar worker original. **Después** enrolar 2 sesiones/dispositivos de propietario auténticos con revocación individual; comparar sesión válida, anónima, revocada y no-owner; log de auditoría seguro, sin copiar JWT ni secretos. Si MFA humano es obligatorio, emitir `HUMAN_REQUIRED` solo para ese trámite. **Por último** verificar recuperación tras reinicio y rollback. No activar B3/ACTGW/PROD en el Paso 2.

## 6. Evidencias consultables
- PR25: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/25
- PR34: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/34
- PR35: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/35
- PR37 no aceptada: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/37
- PR38: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/38
- PR40: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/40
- CUT51 CI: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42373855637
- Drive continuidad: https://drive.google.com/file/d/1nyXapCA8NngE6ZoK6EO5u9hJl4l4e7sc/view
- Notion JARVIS: https://app.notion.com/p/55e81b1a756d83038626016963610cb6

## 7. Gate del paso
**PASO 1 · INVENTARIO DOCUMENTAL = HECHO CON LIMITACIONES EXPLÍCITAS.** No equivale a cierre B2–B10 ni certificación física. **NEXT_BLOCK: B2 CUT32 OWNER_ACCESS_ENFORCEMENT_PREFLIGHT**, mantener fail-closed si no es demostrable. **ROLLBACK DOCUMENTAL:** revertir el commit de este único documento en PR35; no muta runtime.

## Addendum vivo B2 · Verificación ampliada del 12-11-2026
- D1 real `cerebro-jarvis-lab-eu` comprobada en Cloudflare: tablas de sesión, inscripción B2, auditoría, grants B3, misiones y denegaciones existentes. **Consultas vivas:** 0 sesiones, 0 inscripciones auditadas, 0 grants de lectura B3; ninguna modificación de filas.
- CUT32: App Access exacta vinculada a un destino Worker, política Allow con **una regla de correo** que coincide con el usuario autenticado de Cloudflare; sin regla Everyone. **No equivale todavía a prueba física de enforcement.**
- La fuente desplegada se obtuvo del sourcemap del Worker. **Los 7 archivos coinciden exactamente con Git** en `cerebro/jarvis-b3-owner-auth-hardening-lab-v0-20261105`; después de actualizar secretos, el bundle conserva las mismas fuentes.
- Faltaban dos bindings exigidos por el propio canario `/__jarvis/owner-check`: **`JARVIS_ACCESS_AUD` y `JARVIS_OWNER_EMAIL`**. Se han instalado como `secret_text` **exclusivamente en CUT32 LAB**, usando identidad y AUD verificados desde el propio proveedor; no se han impreso valores ni incorporado al repositorio.
- Nuevo despliegue de CUT32 tras esos secretos: versión `7705dda9-57e5-4baf-9e95-db75a0bf1e62`; se verificó configuración final: D1 intacta, seis flags (incluido entorno LAB) sin alteración, **B2/B3/Gateway OFF**, `workers.dev=false`, previews `false`.
- Se habilitó `workers.dev` **temporalmente** únicamente para comprobar anónimo; el comprobador externo no obtuvo respuesta utilizable. **Se ejecutó y verificó inmediatamente el rollback** `workers.dev=false`, previews `false`. Por tanto **NO hay prueba de challenge Access anónimo y no se mantiene ninguna URL pública**.
- **B2 continúa PARCIAL**: faltan desafío anónimo observado, canario propietario real, sesión auténtica en dos dispositivos físicos, revocación selectiva y recuperación. No se pasa a Paso 3 sin B2 VERDE. Próxima acción en Work/Cloud Browser autenticado y dos dispositivos reales, sin pedir secretos por chat.
- Registro estructurado: `zeus/jarvis/STATE_MASTER_2026-11-12.json`. Este addendum actualiza los hallazgos documentales y no implica promoción, fusión, modificación de App/CRM/ANA/PROD/CUT30 ni coste contratado adicional.
