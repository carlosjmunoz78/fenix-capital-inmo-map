# FACT-001 Changelog

## 0.4.11 · 2026-09-08
- Implementado `COMPET-001` V0.2 en runtime compartido PREPROD como inteligencia competitiva determinista y public-evidence-only.
- Consume exactamente las dependencias canónicas `KW-001`, `LOCALP-001`, `SCAN-001`, `SOCAUD-001` y `WAUD-001`; no se añade `BMD-001` fuera del contrato vigente.
- V0 no descubre ni inventa competidores por inferencia: requiere evidencia pública explícita; si falta, devuelve `LOW_CONFIDENCE`.
- Market share, revenue, headcount, traffic, ad spend, search rank, followers y review metrics quedan `unknown_without_public_evidence` salvo evidencia pública explícita válida.
- Rechaza cruce de `company_id`, material sensible y ejecución PROD; no usa login, credenciales, APIs privadas ni escritura remota.
- FACT-001 promueve `COMPET-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.19.0 → 0.20.0.
- Dependency map avanza a 0.10.0 y registra `COMPET → KW/LOCALP/SCAN/SOCAUD/WAUD` más la relación de onboarding explícita.
- Backup/rebuild por Git+manifest+replay de evidencia; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

## 0.4.10 · 2026-09-08
- Implementado `SOCAUD-001` V0.2 en runtime compartido PREPROD como auditoría social determinista y pública/read-only.
- Consume `AUD-001`, `BMD-001`, `SCAN-001` y evidencia social pública fechada; no usa login, credenciales ni APIs privadas.
- Audita perfiles observados, formatos, cobertura y cadencia únicamente con timestamps suficientes; seguidores y otras señales sólo se aceptan si están explícitamente presentes en evidencia pública.
- No publica, no envía mensajes, no escribe remotamente y no fabrica alcance, engagement, audiencia, seguidores ni cadencia.
- FACT-001 promovió `SOCAUD-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.18.0 → 0.19.0.
- Dependency map avanza a 0.9.0; con SOCAUD + LOCALP + KW + WAUD + SCAN se desbloquea el contrato de `COMPET-001`.
- Backup/rebuild por Git+manifest+replay de evidencia; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

## 0.4.9 · 2026-09-08
- Implementado `LOCALP-001` V0.2 en runtime compartido PREPROD como auditoría local determinista y read-only.
- Consume `BMD-001`, `SCAN-001`, hechos declarados y evidencia pública local fechada; `SEO-001` se preserva como frontera SEO/local canónica.
- Audita NAP, categorías, servicios, cobertura geográfica y estado de evidencia de reviews; rating/review_count quedan desconocidos si no existe evidencia pública válida.
- No accede ni muta Google Business Profile, no usa credenciales, no escribe remotamente y no requiere IA de pago.
- FACT-001 promovió `LOCALP-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.17.0 → 0.18.0.
- Dependency map avanza a 0.8.0; LOCALP desbloquea dependencias de COMPET/SEOBOOT sin declarar esos motores operativos.
- Backup/rebuild por Git+manifest+replay de evidencia; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

## 0.4.8 · 2026-09-08
- Implementado `KW-001` V0.2 en runtime compartido PREPROD como Keyword Discovery determinista y evidence-only.
- Consume `BMD-001`, `WAUD-001`, semillas declaradas y geografía explícita; `SEO-001` se preserva como frontera SEO canónica.
- Genera oportunidades, intent, clusters y prioridad reproducible; volumen, CPC, dificultad y ranking permanecen `unknown_without_authorized_source` en ausencia de fuente autorizada.
- Rechaza cruces de `company_id`, material sensible y ejecución PROD; no realiza escritura remota ni requiere IA de pago.
- FACT-001 promovió `KW-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.16.0 → 0.17.0.
- Dependency map avanza a 0.7.0; `SCAN → BMD → WAUD → KW` queda ahora implementado en PREPROD por el grafo Factory.
- Backup/rebuild por Git+manifest+replay de evidencia; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

## 0.4.7 · 2026-09-08
- Implementado `WAUD-001` V0.2 en runtime compartido PREPROD como Website Audit determinista y read-only.
- Reutiliza `WEB-001` como frontera web canónica, `SCAN-001` como evidencia pública, `BMD-001` como contexto de negocio y `SEO-001` como frontera SEO; no duplica crawler ni muta WordPress/Cloudflare/SEO.
- Evalúa señales técnicas y de conversión sobre snapshots normalizados: HTTP, title, meta description, canonical, H1, lang, viewport, formularios, tracking e imágenes.
- Rechaza cruces de `company_id`, material sensible y ejecución PROD; no usa credenciales, no realiza login y no escribe remotamente.
- FACT-001 promovió `WAUD-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.15.0 → 0.16.0.
- Dependency map avanza a 0.6.0; la ejecución de onboarding sigue el grafo Factory `SCAN → BMD → WAUD → KW` hasta reconciliación explícita de la secuencia textual.
- Backup/rebuild por Git+manifest+replay de snapshots; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

## 0.4.6 · 2026-09-08
- Implementado `BMD-001` V0.2 en runtime compartido PREPROD como Business Model Discovery determinista basado en evidencia.
- Consume identidad/geografía canónica de `COMP-REG-001`, evidencia pública de `SCAN-001` y hechos empresariales explícitamente declarados.
- V0 no inventa servicios, productos, clientes, canales, propuesta de valor ni restricciones ausentes; cuando faltan dimensiones críticas devuelve `LOW_CONFIDENCE`.
- Rechaza cruce de `company_id`, material sensible y cualquier intento de ejecución PROD; no requiere IA de pago ni infraestructura nueva.
- FACT-001 promovió `BMD-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.14.0 → 0.15.0.
- Dependency map avanza a 0.5.0 y declara `COMP-ONB → BMD`, `BMD → COMP-REG/SCAN`.
- Se conserva/documenta la discrepancia de orden: el texto de onboarding pone KW/WAUD antes de BMD, pero el grafo Factory exige BMD antes de WAUD/KW; ejecución sigue el grafo hasta reconciliación explícita.
- Backup/rebuild por Git+manifest+evidencia reproducible; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

## 0.4.5 · 2026-09-08
- Implementado `SCAN-001` V0.2 en runtime compartido PREPROD como Digital Footprint Scanner determinista y read-only.
- Inventario previo no encontró crawler/scanner equivalente en el repo; `WEB-001` se conserva como frontera web canónica y SCAN no lo sustituye.
- V0 inspecciona root HTML, `robots.txt`, `sitemap.xml`, señales tecnológicas y perfiles sociales públicos enlazados mediante fetcher inyectado.
- CI no depende de Internet: tests usan fetcher local falso; no polling, credenciales, brute force, enumeración agresiva ni escritura remota.
- Cada salida conserva `company_id`, dominio, timestamp de evidencia y SHA-256; coste adicional objetivo 0 €.
- FACT-001 promovió `SCAN-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.13.0 → 0.14.0.
- Dependency map avanza a 0.4.0 y declara `COMP-ONB → SCAN`, `SCAN → COMP-REG/WEB/AUD`.
- Backup/rebuild por Git+manifest+contrato; rollback por puntero versionado FACT-001. PROD autonomy `DENY`.
- Candidate y workflow temporal de promoción se retiran antes de PR. Sin Supabase PROD, WordPress, Cloudflare ni Trading REAL.

## 0.4.4 · 2026-09-08
- Implementado `COMP-ONB-001` V0.2 en runtime compartido PREPROD como orquestador determinista de onboarding multiempresa.
- El motor usa `COMP-REG-001` como identidad/lifecycle y `TENANT-001` como aislamiento deny-by-default; no crea servidores, bases o credenciales por empresa.
- Pipeline V0 ordenado: `SCAN → KW → WAUD → SEOBOOT → COMPET → MKT-002 → SOCAUD → LOCALP → MKTBOOT → BMD → PROC → KBOOT → CRMBOOT → APPBOOT → AUTBOOT → TRNBOOT → ENGACT → COMP-HLT → COMP-BKP → COMP-DEP`.
- V0 no auto-ejecuta motores downstream ni interpreta scaffolds como capacidad operativa; sólo coordina readiness, evidencia, bloqueos y progreso.
- Cada paso exige evidencia explícita, bloquea con los 8 códigos HUMAN_REQUIRED canónicos o blockers de sistema declarados y requiere evidencia de resolución para reanudar.
- Finalizar el pipeline deja estado `PREPROD_PIPELINE_COMPLETE`; no cambia automáticamente la empresa a `ACTIVE` y no concede autonomía PROD.
- FACT-001 `version_engine.py` promovió el puntero Registry de `COMP-ONB-001` 0.1.0 → 0.2.0 preservando byte-a-byte el scaffold Factory; unit tests + contrato de familia pasaron SUCCESS.
- Añadidos contrato runtime, tests, documentación, backup snapshot SHA-256, rollback versionado y rebuild; dependency map avanza a 0.3.0.
- Workflow/candidate temporales de promoción retirados antes de PR. Coste adicional objetivo 0 €. No Supabase PROD, WordPress, Cloudflare ni Trading REAL.
- PROD autonomy permanece `DENY`; #124, #126 y #133 siguen siendo excepciones externas abiertas.

## 0.4.3 · 2026-09-08
- Implementada la cadena CEREBRO Console V0 en PREPROD mediante evolución versionada FACT-001, preservando scaffolds inmutables y sin tocar PROD.
- `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` pasan de scaffold `0.1.0 / DEFINED_NOT_BUILT` a versión `0.2.0 / CONFIRMED_OPERATIONAL` en PREPROD.
- Engine Registry avanza `0.7.0 → 0.12.0` manteniendo `version_history` y `factory_scaffold` por motor.
- `CTX-001` usa COMP-REG-001 + TENANT-001 para contexto multiempresa autorizado; `CHAT-001` es provider-neutral y no llama a modelos; `CMD-001` sólo genera planes; `ACTGW-001` ejecuta únicamente handlers PREPROD explícitamente registrados y mantiene mutaciones en DENY; `CONSOLE-001` orquesta selector/contexto/chat/comando/acción/historial/auditoría.
- Mapa de dependencias ampliado con la cadena `COMP-REG → TENANT → CTX`, `CHAT+CTX → CMD`, `CMD+POL+AUD → ACTGW`, `CTX+CHAT+CMD+ACTGW → CONSOLE`.
- Candidates y workflow temporal de promoción retirados antes de PR; coste adicional objetivo 0 €.
- Evidencia añadida en `governance/console-chain-v0-closeout-2026-09-08.json`, incluyendo backup, rollback, rebuild y autonomía.
- PROD autonomy permanece `DENY`; #124, #126 y #133 no se falsean como resueltos.

## 0.4.2 · 2026-09-08
- Añadido `scripts/version_engine.py` como workflow determinista de actualización versionada para motores ya materializados.
- El scaffold original `generated/<engine_id>/...` queda inmutable; las evoluciones se escriben en `versions/<engine_id>/<version>/engine.manifest.json`.
- Engine Registry puede mover su puntero a una versión superior sin alterar el scaffold de FACT-001, preservando la idempotencia `family/create → NO_CHANGE`.
- `apply --plan` no escribe; `apply` exige versión semver superior, coste adicional objetivo 0 €, backup/rollback/rebuild declarados y entorno no-PROD.
- `rollback` mueve el Registry a una versión/scaffold existente sin borrar versiones posteriores; conserva historial de punteros para auditoría.
- V0.4 rechaza candidatos `PROD`: la promoción PROD continúa gobernada por contratos, tribunal, PREPROD, política y HUMAN_REQUIRED aplicables.
- Tests cubren no-write, preservación byte-a-byte del scaffold, actualización Registry, idempotencia Factory post-versionado, rollback, monotonicidad de versión y rechazo PROD.
- `FACT-001 Factory V0` de PR #139 validó Registry/manifests y todos los unit tests en verde; App Compatibility se vuelve a exigir antes de merge.
- Coste adicional: 0 €. Sin deploy, DDL, permisos, secretos ni infraestructura externa.

## 0.4.1 · 2026-09-08
- Cerrado el loop de los cuatro objetivos estructurales/PREPROD con evidencia post-merge completa.
- `PRE-PROD App Build` #3338 terminó SUCCESS tras PR #137: Build PREPROD, Browser QA, CORS smokes, candidato PROD inmutable, QA exacto, leak assertion, sellado y artifacts verdes.
- Los cuatro objetivos quedan clasificados verdes en alcance estructural/PREPROD; esto no cambia el estado de autonomía PROD.
- #124 Branch Protection, #126 LAB-TRD runtime y #133 Cloudflare Pages secret rotation continúan como HUMAN_REQUIRED/SECURITY_INCIDENT externos y mantienen PROD autonomy en `DENY`.
- Añadida evidencia `governance/four-objectives-closeout-2026-09-08.json`.
- No deploy PROD, no DDL PROD, no rotación de secretos, no purge y coste adicional 0 €.

## 0.4.0 · 2026-09-08
- PR #135 integrado tras `FACT-001 Factory V0` + `FACT-001 App Compatibility` verdes; `PRE-PROD App Build` post-merge #3336 terminó SUCCESS.
- Materializada `WAVE1-MULTICOMPANY-CONSOLE-V0` mediante la propia FACT-001 en rama aislada.
- Engine Registry actualizado `0.4.0 → 0.5.0`: `17 → 46` motores, 29 nuevos, 0 IDs duplicados.
- Cada motor Wave 1 contiene 18 archivos estándar y permanece `DEFINED_NOT_BUILT`, `PREPROD`, `NONE_UNTIL_GATES_PASS`, coste objetivo 0 € y PROD `DENY`.
- Test canónico post-materialización actualizado para exigir idempotencia `NO_CHANGE`, inventario exacto de 46 motores y estado inerte.
- PR #136 pasó Factory + App Compatibility y se integró; `PRE-PROD App Build` post-merge #3337 terminó SUCCESS con build, Browser QA, CORS, candidato PROD inmutable, QA exacto, leak guard, sellado y artifacts verdes. Sin deploy PROD.
- `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` quedan materializados sólo como scaffolds; no se declaran operativos y Console no se conecta directamente a un modelo.
- Auditoría WordPress/Core Guard en solo lectura confirmó que la vía canónica de caché Cloudflare es Fénix Core Guard → API directa Cloudflare, sin Make como dependencia operativa y con coste adicional 0 €.
- Core Guard PROD permanece `observer`, health 100, writes operativos cerrados y Cloudflare actualmente `available=false`; no se ejecutó purge ni mutación.
- #133 actualizado: el secreto `plain_text` de Cloudflare Pages no está demostrado como credencial/consumer de Core Guard; caller/ownership de Pages sigue por resolver antes de cualquier rotación.
- Añadida evidencia `governance/cloudflare-wordpress-plugin-audit-2026-09-08.json`.

## 0.3.0 · 2026-09-08
- FACT-001 incorpora generación atómica por familias mediante `factory.py family`.
- Añadida prevalidación completa antes de escribir: IDs duplicados, conflictos con Registry/scaffolds existentes y dependencias conocidas opcionales.
- Añadida idempotencia de familia: segunda ejecución idéntica devuelve `NO_CHANGE`.
- Añadida política de conflicto all-or-nothing: si una definición existente no coincide, ningún motor nuevo del lote se escribe.
- El generador sigue siendo filesystem-only y no despliega, no llama a PROD, no cambia permisos ni crea infraestructura.
- Cada scaffold generado conserva estado `DEFINED_NOT_BUILT`, autonomía `NONE_UNTIL_GATES_PASS`, coste adicional objetivo 0 € y tribunal/promotion DENY por defecto.
- Definida `WAVE1-MULTICOMPANY-CONSOLE-V0` con 29 motores nuevos, ordenados por dependencias, sin duplicar APP/CRM/SEO/WEB/TRN/Policy/Human Exception/Event/Job/Audit/Observability ya registrados.
- La Wave 1 cubre Company Registry/Onboarding, discovery de negocio/procesos/huella digital, Web/Keyword/Social/Local audit, Competitor + Market Intelligence, Knowledge/SEO/Social/Marketing bootstrap, CRM/App/Automation/Training bootstrap, Engine Activation/Tenant Isolation, Company Supervisor/Backup/Deployment y Gateway/Console V0.
- Añadidos tests de plan sin escritura, generación/registro, dependencias, idempotencia, conflicto atómico, duplicados y preflight canónico de la Wave 1.
- No se concede autonomía PROD ni se muta App/CRM/Web/Social/Supabase/Trading.

## 0.2.0 · 2026-09-08
- Verificado y fusionado PR #131 únicamente tras `FACT-001 Factory V0` + `FACT-001 App Compatibility` verdes; el `PRE-PROD App Build` post-merge #3333 terminó SUCCESS.
- Reconciliado Cloudflare Workers NON-PROD preservando exclusivamente los triggers `main` y documentando rollback.
- Reconciliado Cloudflare Pages con cambio mínimo `preview_deployment_setting: all → none`, preservando `production_branch=main` y `production_deployments_enabled=true`; configuración build legacy no modificada para evitar riesgo sobre main/PROD.
- Creada evidencia Pages `governance/cloudflare-pages-reconciliation-2026-09-08.json`; PR #132 pasó Factory + App Compatibility antes de merge y `PRE-PROD App Build` post-merge #3334 terminó SUCCESS.
- Cerrado issue #127 con evidencia reproducible, OLD vs NEW y rollback. No se realizó deploy PROD.
- Issue #124 revalidado: branch/ruleset admin sigue bloqueado por autorización externa. HUMAN_REQUIRED exacto documentado; no se inventó verde.
- Issue #126 revalidado por GitHub, Drive, Notion, Make y disponibilidad de conectores: no existe ruta actual de health Compute/VM. HUMAN_REQUIRED exacto documentado y `REAL_AUTHORIZED=false` / `BLOCK_REAL` preservado.
- Creado issue #133 `SECURITY_INCIDENT` por configuración sensible de Cloudflare Pages visible como `plain_text`; ningún valor secreto se almacena en repo, issues ni evidencia. Rotación bloqueada hasta inventariar consumidores/ownership.
- Sincronizada la cola HUMAN_REQUIRED a v1.7.0 y añadida evidencia `governance/pre-factory-gate-closeout-2026-09-08.json`.
- Gate estructural PREPROD para fabricación por familias: `READY`. Esto autoriza únicamente scaffolds inertes/registrados en PREPROD; autonomía PROD continúa `DENY`.
- Coste adicional: 0 €.

## 0.1.0 · 2026-09-07
- Rama aislada creada desde `preprod-app-phase1`.
- Añadido schema canónico de motor.
- Añadida plantilla de manifest.
- Creado Engine Registry inicial con FACT-001 y APP-001.
- Registrado APP-001 como specimen auditado, sin modificar la App real.
- Añadido mapa inicial de dependencias basado en auditoría viva.
- Añadido validador determinista sin dependencias externas.
- Añadidos tests y workflow CI exclusivo de FACT-001.
- Abierto PR draft contra PREPROD; no autorizado para merge/promoción a PROD.

## Reglas de continuidad
- No fusionar hasta que CI esté verde y se cierre el caller inventory crítico aplicable al cambio.
- No modificar contratos, RLS, Edge Functions o comportamiento PROD desde esta rama.
- Toda ampliación debe actualizar Registry, dependency map y este changelog.
