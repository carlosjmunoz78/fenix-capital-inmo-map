# CEREBRO OS · 28 MACROFRENTES OPERATIVOS CONSOLIDADOS

Nota: las fuentes del proyecto no contienen una lista histórica única titulada exactamente “28 tareas”. Esta lista es una **normalización operativa** del trabajo previsto y de las capacidades ya documentadas, para que el runtime pueda tratarlas como raíces de un DAG sin inventar nuevas obligaciones.

## M01 · Runtime compartido + JOB-001
Cola durable, scheduler/work pump, leases, heartbeat, retries, dead-letter, pause/resume, recovery tras caída.

## M02 · DAG profundo y descomposición masiva
28 raíces → miles de microtareas atómicas reales; dependencias, parent/subtask, fan-out/depth controlados, dedupe e idempotencia.

## M03 · Concurrencia, capacidad y backpressure
Mantener workers útiles ocupados; validar target/caps vivos; fairness por raíz/company/engine; locks y resource classes.

## M04 · Execution/Model Router + DeepSeek
Router desacoplado; determinista/OSS/free-first; DeepSeek como adapter cuando aporte razonamiento, investigación, comparación o redacción; fallback automático.

## M05 · FinOps, presupuesto y cuotas
Cost guard, quota snapshots, hard stop, coste por job/proveedor/empresa, cero gasto silencioso y fallback por límites.

## M06 · FACT-001 Engine/Skill Factory
Scaffold estándar de motor/capability/skill con manifest, config, contratos, policy, events, jobs, tests, evaluación, observabilidad, backup, rollback, rebuild y training hooks.

## M07 · Registry, versionado, impacto y documentación
Engine/Skill Registry, auto-registration, versionado, mapa de dependencias, changelog, runbook, contratos y autonomía.

## M08 · QA-001 + EVA/Tribunal + OLD vs NEW
Tests comunes, E2E, shadow/real-world testing, comparación OLD/NEW, evaluación transversal y promoción/rollback.

## M09 · LRN-001 Learning Loop
evento→resultado→regla→validación; procedure learning, replay, self-improvement seguro y aprendizaje de correcciones.

## M10 · Observabilidad, Supervisor y evidencia
Health, watchdog, stale recovery, provenance, métricas de cola/latencia/ocupación/coste, alertas y aceptación física.

## M11 · IAM y permisos ordinarios
Service accounts/scopes, standing permissions por company/capability/action/environment/money_limit y mínimo privilegio.

## M12 · Vault, secretos y sesiones
Secret handling, reutilización segura, auto-renew token/session, no pedir secretos ya almacenados y no exponerlos en chat/logs/repos.

## M13 · Channel/Tool Router
Ruta preferente API→MCP/connector→webhook→script/CLI→browser/computer use; health checks, fallback y circuit breaker.

## M14 · Browser Bridge / Computer Use
Envolver y mejorar el bridge existente; prueba física real, identidad de dispositivo/perfil, kill switch, evidencia semántica y procedure replay.

## M15 · Android Device Worker + comunicación humana
Worker Android propio cuando proceda, patrones Jarvis, canales de comunicación y ejecución móvil sin crear un motor duplicado.

## M16 · CEREBRO Console + Gateway
Login, selector empresa/contexto, chat, órdenes, motores, jobs, HUMAN_REQUIRED Inbox, historial, auditoría, costes y kill switch; siempre vía Gateway/Orchestrator.

## M17 · Multiempresa + Company Bootstrap
company_id/engine_id/environment/version; Registry, tenant isolation, discovery, CRM/App/Automation/Training bootstrap, supervisor, backup/rebuild y offboarding.

## M18 · Digital Build + App Factory + Brand/Commerce/Multimedia · DIGITAL INDUSTRY
Objetivo: convertir una necesidad de negocio o un brief en activos digitales completos, probados, entregables, observables, reversibles y reutilizables, sin rehacer lo que ya existe. Reutilizar primero FACT-001, APPFACT-001, BRANDBOOT-001, Technology Scout, runtimes, templates, skills, contratos, QA/EVA/Tribunal, Browser QA, deployment y aprendizaje existentes.

Cobertura funcional mínima: Business-to-Digital Architect; Buy/Build/Improve Gate; Technology Scout; Brand Factory; Design System Factory; UX/Prototype Factory; Web Factory; WordPress/Gutenberg/Block Theme/Elementor when justified; Funnel/Landing Factory; Ecommerce Factory; SaaS Factory; Marketplace Factory; PWA/Mobile/Desktop Factory; Browser Extension Factory; Plugin/Theme/Module Factory; API/Backend/Connector/MCP Factory; Automation Factory; Data Product Factory; AI Feature Factory; Multimedia Factory; Content/SEO/ASO/Localization Factory; Legal/Compliance/Accessibility/Security/QA/Performance Factory; Deployment/Migration/Backup/Rebuild/Observability/Growth/Monetization/Support/Evolution Factory.

Un brief debe poder producir, según necesidad real: discovery, competencia, buyer personas, naming/brand, design tokens, web, SEO, CRM/forms, automatizaciones, calculadoras, área cliente, PWA/app, plugins, documentación, social, imágenes, vídeo, campañas, analítica, dashboards, backups y monitorización. No se construyen piezas irrelevantes: el Build/No-Build Gate decide qué fabricar, reutilizar, envolver, mejorar, posponer o rechazar.

Todo producto debe compartir un Product DNA versionado: Business DNA, Brand DNA, Product DNA, Design DNA, Content DNA, Data DNA, Automation DNA, Deployment DNA y Growth DNA. Artefactos mínimos: company_id, product_id, artifact_id, artifact_type, engine_id/capability_id, environment, version, source_spec_version, brand_version, template_version, dependencies, licenses/provenance, data_classification, security_profile, deployment_target, cost_budget y rollback_ref.

Transformaciones soportadas de forma gobernada: web→PWA; web→móvil; web app→desktop; Figma/diseño autorizado→app; screenshot/mockup autorizado→componentes UI; WordPress legado→arquitectura mejorada; WooCommerce→headless cuando aporte valor; Excel/Sheets→app; Notion→portal; formulario→mini CRM; proceso manual→software; API→plugin/MCP; software→white-label; producto→multiempresa; empresa existente→Digital Twin + sistema mejorado. La ingeniería inversa solo se aplica a activos propios/autorizados y nunca debe saltarse propiedad intelectual, términos ni controles de terceros.

Digital Twin Builder obligatorio antes de sustituir sistemas existentes: inventariar rutas, componentes, datos, formularios, APIs, dependencias, SEO, tracking, permisos, integraciones, comportamiento y contratos; luego crear implementación paralela, PREPROD, OLD vs NEW y rollback probado.

Template Genome: mantener catálogo versionado de templates, componentes y patrones reutilizables (header, hero, pricing, features, testimonials, calculator, FAQ, CTA, checkout, dashboard, map, directory, table, profile, wizard, timeline, chat, auth, settings, admin, notifications). Reutilizar componentes probados; crear uno nuevo solo si existe ventaja medible.

AI-native por diseño cuando sea útil: interfaz humana + API + webhooks + MCP/tools/adapters para que un mismo producto pueda ser consumido desde web, móvil, JARVIS/CEREBRO, agentes autorizados y API. Ningún producto debe quedar acoplado a un modelo concreto.

White-label/multiempresa por defecto cuando aplique: company_id, brand_id, product_id, features, permissions, domain, locale e integrations; evitar forks por cliente. Debe existir aislamiento estricto de datos, secretos, conocimiento, permisos y métricas.

Multimedia Factory: un campaign brief puede generar concepto, copy, storyboard, imágenes, vídeo multiformato, subtítulos, voz autorizada, audio permitido, thumbnail, GIF, carrusel, story, banner, email, landing, PDF/presentación y variantes A/B, siempre conservando editables, licencias/provenance y reglas de marca.

Lifecycle obligatorio: DISCOVER → VALIDATE → SPECIFY → DESIGN → BUILD → VERIFY → LAB/PREPROD → LAUNCH GATE → OBSERVE → LEARN → EVOLVE → RETIRE. Gates mínimos: BUILD_PARITY, BUSINESS_VALUE, LEGAL/IP, SECURITY/PRIVACY, ACCESSIBILITY, SEO/DISCOVERABILITY, PERFORMANCE, COST, QA, USER_ACCEPTANCE, RELEASE, BACKUP/REBUILD y ROLLBACK.

Autonomía: dividir automáticamente este alcance en parent tasks y subtareas lazily materialized, con DAG, dependencias, dedupe, idempotencia, evidence y fan-in. CEREBRO ejecuta trabajo ordinario en LAB/PREPROD; escalar solo por LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT o CUSTOMER_HUMAN_REQUEST.

Política de coste: lógica determinista/open-source/local/stack ya contratado/free tier antes de pago; IA de pago no es requisito. No comprar suscripciones, dominios, planes, app-store accounts ni infraestructura sin MONEY_LIMIT/ROI aprobado.

Definition of Done de M18: capability/inventory crosswalk completo; duplicados eliminados; gaps clasificados REUSE/WRAP/EXTEND/BUILD/DEFER/REJECT; Capability Graph + Dependency Graph + Artifact Graph; control plane y contratos verificados; candidatos construidos solo en LAB/PREPROD; tests/evals/Tribunal/observabilidad/coste/backup/rollback/rebuild GREEN; al menos un producto representativo construido de idea a preview aceptado; aprendizaje capturado en FACT/LRN; PROD solo mediante promoción gradual autorizada.

## M19 · Technology Scout + Safe Engineering
Vigilar OSS/free tiers/capabilities, benchmark LAB, OpenCode/Superpowers/patrones de skills, worktrees/sandboxes y adopción solo con evidencia.

## M20 · Research/Web Acquisition/COMPET
Web Acquisition Layer, Scrapling/Crawlee/Apify fallback, research, competencia continua, source discovery y datos con provenance.

## M21 · CAP + Intent + Enrichment + LEAD
Captación autónoma, ICP, enrichment waterfall, first-party events, visitor intent, scoring, contact verification y next-best-action.

## M22 · SALE + cadencias + agenda + propuesta/contrato/pago
Email/WhatsApp/call cadence, rechecks, booking/reminders/reschedule/no-show, propuestas, presupuestos, firma, Stripe, factura y entrega.

## M23 · VOICE + Speed-to-lead + Rescue
STT/TTS local-first, llamadas inmediatas, recuperación de llamadas perdidas, cualificación por voz, objeciones y lead rescue.

## M24 · RET/REF/REP + Revenue Attribution/WTP
Retención, churn, customer rescue, upsell/cross-sell, referral, reputación, source→sale→margin, ROI y WTP real.

## M25 · Marketing + Ads + SEO + Local + Social + Multimedia
Ads audit, creative/landing testing, SEO-001, Local SEO, social audit, conversion feedback, newsletters, lead magnets y CITY COMPLETE V2.

## M26 · Fénix App/CRM/Notion/Knowledge/Training
Preservar y completar App Fénix, CRM, Supabase core, Notion, documentación, training, roles, agenda/tareas y operaciones financieras sin romper legado.

## M27 · AION + CAPTACASA como programas separados
AION Product Factory/Operating Layer y CAPTACASA con repo/datos/infra propios; integrar por contratos/eventos, nunca mezclarlos por comodidad.

## M28 · Seguridad, Legal, Backup/Rebuild, PROD gates y Trading aislado
Policy, RLS/RBAC, security gates, legal/fiscal cuando aplique, backup/restore/rebuild, DR, PREPROD, promoción gradual y Trading LAB físicamente aislado.
