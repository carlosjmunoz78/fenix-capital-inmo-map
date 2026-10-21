# CEREBRO OS · Changelog · Channel Intelligence V1

## 2026-10-21

### Añadido

- Rama aislada `cerebro/channel-intelligence-v1`.
- Issue de implementación #860.
- Draft PR #861.
- `CHANNEL-INTELLIGENCE-V1` como capability de `MKT-001`, sin crear engine IDs nuevos.
- Web Operating Profile sobre motores existentes.
- Channel Pod Profile por `company_id + channel_id`.
- Roles lógicos de canal: dirección, tendencias, competencia, audiencia, mercado, creatividad, formatos, copy, multimedia, publishing/verification, community, experimentación, analytics, forecasting, learning, brand y policy/QA.
- Trend lifecycle: `SEED`, `EMERGING`, `BREAKOUT`, `MAINSTREAM`, `SATURATED`, `DECLINING`.
- Trend Opportunity Score V1 con aceleración, momentum, adecuación, intención, demanda, gap competitivo, difusión y penalizaciones por saturación/riesgo/coste.
- Visual Taste Profile como señal aprendible, no como regla absoluta.
- Cross-channel insight con reinterpretación obligatoria y bloqueo de copia ciega.
- Plan de alta de nueva red mediante Factory/profile sin ampliar por defecto los 177 motores.
- Adapter multiempresa que reutiliza `WAUD-001`, `SOCAUD-001` y `SOCBOOT-001` existentes.
- Tests de aislamiento, seguridad, coste, no-PROD, scoring, nuevas redes y reutilización de pipeline.
- CI específica `CEREBRO Channel Intelligence V1`.
- Dependency map, runbook, autonomía/backup/rebuild y evidencia PREPROD.
- Publisher Gateway neutral a proveedor, PREPROD y fail-closed.
- Evidencia versionada de topología actual: Buffer como publisher; Make como read/metrics bridge.
- Plan de migración futura de Buffer a adapters directos sin convertir Buffer en dependencia estructural permanente.
- Tests que impiden resolver Make como publisher y que bloquean cualquier write externo desde esta V1.

### Corregido durante QA

- Primer run ampliado de integración detectó una suposición de orden en los perfiles sociales descubiertos.
- Se corrigió el test para validar el conjunto de Pods independientemente del orden de descubrimiento.
- Run posterior quedó GREEN.
- Se corrigió el supuesto arquitectónico de publicación: las rutas Make activas auditadas son de lectura/métricas; Buffer permanece como publisher actual evidenciado.

### Preservado

- Registry canónico: 177 motores, sin cambios.
- App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading existentes.
- `post-scan-parallel-v1.mjs` y `bootstrap-tier-v1.mjs` como implementaciones canónicas reutilizadas, no sustituidas.
- Repo existente `fenix-capital-cerebro-social` y su runtime Buffer.
- Rutas Make de lectura/medición existentes; no se desactivan ni se reconvierten en publishers.
- Coste adicional objetivo 0 €.
- Trading aislado.

### No habilitado todavía

- publicación social física desde `CHANNEL-INTELLIGENCE-V1`;
- sustitución física de Buffer;
- adapters directos Meta/LinkedIn con write binding;
- escritura WordPress PROD;
- ejecución Ads/gasto;
- collectors always-on de tendencias/competencia por plataforma;
- binding físico de scheduler para esta capability;
- baseline/captura visual automática de la web oficial;
- autonomía PROD.

### Contexto de despliegue

La implementación avanza en paralelo a la promoción STAGING→PROD de Fénix Capital. La PR permanece draft y separada para no interferir con ese despliegue. La baseline de la nueva web solo se fijará después de verificar estabilidad de PROD.
