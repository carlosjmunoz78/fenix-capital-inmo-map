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

## M18 · Digital Build + App Factory + Brand/Commerce/Multimedia
Web, PWA, móvil, escritorio, plugins, themes, design systems, BRANDBOOT, commerce, multimedia y deployment/migration reutilizando FACT.

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
