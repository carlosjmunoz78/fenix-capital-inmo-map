# UNIVERSAL_PLUGIN_FULL · Capability audit · 2026-09-28

## Estado
PARCIAL AVANZADO. Se reutilizan capacidades existentes; no se crea un segundo plugin monolítico ni se toca PROD.

## Evidencia viva WordPress
- 28 plugins instalados.
- Fénix Core Guard 1.0.5 activo.
- Fénix CEREBRO Leads 1.3.2 activo.
- Fénix CEREBRO Maintenance 0.1.1 activo.
- Fénix SEO CEREBRO Bridge 0.4.1 activo.
- Fénix SEO REST Bridge 1.0.0 activo.
- Cowboy MCP 1.6.8 activo.
- WPVibe está instalado/activo, pero queda fuera de la vía operativa canónica.
- Make Connector está activo, pero no es dependencia del rollout.
- Core Guard: operational_writes_allowed=false en PROD.
- Jaén: piloto CITY_GROWTH certificado; MASS permanece false.

## Cobertura actual

| Capacidad | Proveedor reutilizado | Estado |
|---|---|---|
| Discovery | REST routes + Abilities | EXISTENTE |
| Content read/create/update | Cowboy WordPress native | EXISTENTE |
| Draft SEO support | Core Guard create-support-post-draft | EXISTENTE EN PLUGIN / exposición por conector POR AUDITAR |
| Publish transaction | Core Guard publish-post-transaction | EXISTENTE EN PLUGIN / exposición por conector POR AUDITAR |
| SEO read/write | Cowboy + SEO REST Bridge | EXISTENTE |
| Media upload/read/update | Cowboy media | EXISTENTE |
| Lead capture | Fénix CEREBRO Leads REST + Elementor hook | EXISTENTE |
| Lead magnet gate | Fénix CEREBRO Leads | EXISTENTE, FÉNIX-SPECIFIC |
| Cache | Cowboy + Core Guard | EXISTENTE |
| Live verify | Core Guard | EXISTENTE |
| Backup/checkpoint | Cowboy + Core Guard snapshots | EXISTENTE |
| Rollback | Cowboy undo/checkpoint + Core Guard restore | EXISTENTE |
| Rebuild/update | CEREBRO Maintenance | EXISTENTE |
| Form management/creation | No forms tools exposed | GAP |
| Newsletter creation/scheduling | No newsletter ability exposed | GAP |
| Multiempresa config | Current live plugins contain Fénix-specific constants/URLs | GAP |
| Provider-neutral gateway | Added in CEREBRO runtime | HECHO V0 |

## Decisión arquitectónica
No reemplazar Core Guard, Leads, SEO Bridge, Elementor, Cowboy ni Maintenance.
PLUGIN-UNIVERSAL-001 es un gateway lógico y policy layer sobre proveedores existentes.

Orden:
CEREBRO Gateway -> PLUGIN-UNIVERSAL-001 -> provider adapter -> WordPress capability.

No:
CEREBRO -> modelo IA -> WordPress directo.

## Gaps para FULL
1. FORM_MANAGE: contrato neutral para crear/configurar formularios y bind de captación.
2. NEWSLETTER_MANAGE: dos streams separados (particulares / inmobiliarias), scheduling semanal y evidencia de envío.
3. MULTIEMPRESA: eliminar hardcodes de Fénix del contrato universal; moverlos a company config.
4. Exponer/confirmar abilities Core Guard de content/media/city executor en el transporte canónico.
5. PREPROD físico: staging connector debe responder antes de cualquier escritura.
6. OLD vs NEW y rollback real.

## Seguridad
- PROD: no writes desde este bloque.
- Mutaciones exigen confirmación/idempotency.
- WPVibe no se usa.
- Make no se usa como dependencia.
- Coste adicional objetivo 0 €.


## Auditoría Hostinger Reach · formularios y newsletter
Evidencia viva de WordPress:
- plugin `Hostinger Reach 1.8.2` activo.
- rutas REST presentes: `contact`, `contact-lists`, `forms`, `builder-forms`, `tags`, `integrations`, `overview`, `status`.
- `forms` soporta GET/POST bajo permiso administrativo; el POST cambia estado `is_active` de formularios existentes.
- `contact` acepta altas de suscriptores y permite grupo/tags.
- el plugin declara sincronización con Elementor y otros builders.
- el readme oficial instalado declara campañas/newsletters y envío, pero la superficie REST de WordPress auditada NO expone crear/programar/enviar campañas.
- las rutas administrativas devolvieron 401 al acceso anónimo esperado; no se intentó saltar autenticación ni extraer tokens.

Decisión:
- `FORM_MANAGE` deja de ser GAP y se vincula a `hostinger_reach/forms:get+post` detrás de PLUGIN-UNIVERSAL-001.
- `NEWSLETTER_MANAGE` sigue fail-closed y sin binding operativo hasta disponer de una API/ability autenticada, documentada y testeable para campaign create/schedule/send.
- no usar `wp_mail()` como sustituto improvisado para campañas masivas.
- no almacenar ni copiar el token interno de Reach.

## Contratos multiempresa añadidos
`cerebro/runtime/wordpress_universal_contracts.py` mueve del gateway a configuración:
- dominio;
- email público;
- endpoint de leads;
- base WordPress;
- contratos de formulario;
- audiencias.

Fénix queda como perfil de compañía y no como comportamiento universal.

Newsletters definidas, aún NO activadas:
1. `newsletter_particulares` · PARTiculares · WEEKLY.
2. `newsletter_inmobiliarias` · INMOBILIARIAS · WEEKLY.

Ambas exigen consentimiento de marketing y no pueden marcarse enabled si no existe provider.
Esto conserva el requisito de dos newsletters semanales sin afirmar envío autónomo antes de tener transporte probado.

## Estado actualizado de gaps
- FORM_MANAGE: HECHO a nivel de provider binding/contrato; escritura real permanece sujeta a PREPROD y autenticación.
- NEWSLETTER_MANAGE: DEFINIDO / fail-closed; campaign API física aún no demostrada.
- MULTIEMPRESA CONFIG: HECHO V0 en runtime contract; falta migración del plugin live Fénix-specific a config inyectable.
- Core Guard abilities de contenido/media/city: existentes en código live; exposición canónica completa sigue POR AUDITAR.
- PREPROD físico WordPress: POR AUDITAR desde este conector; no se usa PROD para demostrar escrituras.


## Reach Public API · evidencia oficial externa
La referencia pública de Hostinger Reach expone actualmente:
- profiles/domains/limits;
- contacts/fields/tags;
- templates;
- campaigns GET/POST;
- campaign statistics;
- automations GET y automation steps GET.

El POST de campaigns crea exclusivamente un DRAFT. La propia documentación indica que targeting y scheduling no forman parte de esa petición y que el draft se termina/envía desde la interfaz Reach.

Por tanto:
- `NEWSLETTER_MANAGE` se vincula a creación de template + campaign draft.
- `NEWSLETTER_SEND` se mantiene deliberadamente UNBOUND.
- `campaign_schedule` / `campaign_send` / mutation de automations se catalogan como `UNSUPPORTED_V0`.
- no se inventa endpoint, no se hace scraping del dashboard y no se usa correo transaccional como sustituto de marketing.
- el contrato está codificado en `hostinger_reach_api_contract.py`.

Resultado funcional V0:
CEREBRO puede preparar de forma determinista las dos newsletters semanales y dejarlas como borradores versionados/listos para la etapa de envío. El envío semanal 100% autónomo permanece POR AUDITAR hasta disponer de una operación oficial de send/schedule o una automatización oficial writable.


## Descubrimiento crítico · runtime universal YA EXISTE en STAGING

Lectura pública del índice REST de `https://staging.fenixcapital.es/wp-json/` demuestra físicamente los namespaces:
- `cerebro-universal/v1`
- `cerebro-universal-qa/v1`

Superficie `cerebro-universal/v1` observada:
- GET `b3/storage-observer`
- POST `batch/preview`
- POST `command`
- GET `command/catalog`
- POST `queue/submit`
- GET `queue/status`
- GET `b3/preflight`
- GET `status`
- GET `capabilities`
- POST `operation`

QA observada:
- POST `cerebro-universal-qa/v1/create-draft-live-once`

Seguridad observada:
- el namespace root es discoverable;
- endpoints protegidos como `status`, `capabilities`, `queue/status` responden 401 sin autenticación;
- un POST vacío controlado a `create-draft-live-once` respondió 401;
- no se produjo escritura.

Decisión arquitectónica obligatoria:
**NO crear ni desplegar un plugin universal duplicado.**
`PLUGIN-UNIVERSAL-001` en CEREBRO OS se redefine como contrato/gateway/policy layer que ENVUELVE el runtime físico existente de staging y reutiliza proveedores existentes.

Contrato congelado:
`cerebro/runtime/contracts/wordpress-universal-staging-v0.json`.

## Estado físico PREPROD relacionado
`fenix-guard/v1/cerebro/status` en staging responde 200 y confirma:
- Core Guard `1.0.0-rc9`;
- build channel `preprod`;
- mode `observer`;
- tablas listas;
- jobs sin pendientes;
- cron jobs + maintenance presentes;
- smoke HTTP/body/H1 verde;
- cache orchestrator previo verde.

Pero `ok=false` porque `operations_locked=false`. Por tanto PREPROD existe físicamente pero NO se declara completamente verde.

También:
- `fenix-cerebro/v1` no está presente en staging (404);
- `city-autocert-status` no está presente en ese build rc9 (404);
- health/readiness protegidos responden 401 sin credencial.

Clasificación:
- runtime universal físico STAGING: EXISTENTE / PARCIAL.
- contrato lógico `PLUGIN-UNIVERSAL-001`: HECHO V0.
- ejecución autenticada contra endpoints `cerebro-universal`: POR AUDITAR.
- cualquier mutación física: PREPROD ONLY + snapshot/rollback + auth válida.


## Canary autenticado PREPROD · provider WordPress + rollback
Se usó el conector autenticado de staging para una prueba controlada sobre un objeto nuevo, sin tocar contenido existente:

1. create draft → post 52300, status draft.
2. read-back → contenido/slug/status correctos.
3. trash → success, recoverable.
4. restore → vuelve a draft.
5. cleanup final → trash recoverable.
6. comprobación pública → HTTP 404.

Nunca se publicó y no hubo impacto PROD.
Evidencia versionada:
`cerebro/factory/governance/plugin-universal-preprod-provider-canary-2026-09-28.json`.

Esto prueba físicamente:
- autenticación del provider PREPROD;
- create/read;
- rollback trash/restore;
- cleanup;
- no exposición pública.

Límite explícito:
esta prueba usa el provider WordPress autenticado y NO demuestra todavía auth/execute directo de los endpoints protegidos `cerebro-universal/v1`.


## Extensión del canary · publish → verify → rollback
Sobre el mismo objeto de prueba PREPROD 52300:
- restore a draft: SUCCESS;
- publish: SUCCESS;
- URL pública canary: HTTP 200;
- cleanup inmediato a trash: SUCCESS;
- URL tras cleanup: HTTP 404.

La prueba no tocó PROD ni contenido preexistente. El objeto final queda recuperable en trash.
Esto demuestra físicamente el camino provider autenticado de create → read → publish → public verify → rollback/cleanup en PREPROD.


## Corrección canónica · newsletters SOLO BREVO
Decisión de negocio confirmada: Hostinger Reach NO se usa para newsletters, ni para borrador, ni para scheduling, ni para envío. Puede seguir existiendo para formularios si aporta valor, pero queda fuera del canal newsletter.

Proveedor canónico:
- Brevo Free.
- API oficial: contactos/listas + campañas.
- alta/actualización de contactos: POST /v3/contacts;
- creación de campaña: POST /v3/emailCampaigns;
- actualización/programación: PUT /v3/emailCampaigns/:id con scheduledAt;
- envío inmediato: POST /v3/emailCampaigns/:id/sendNow.

Límites gratuitos modelados:
- 300 emails/día;
- hasta 100.000 contactos almacenados;
- automatizaciones activas limitadas a 2.000 contactos únicos.
El runtime NO comprará plan superior automáticamente. Cuando una edición supera la capacidad diaria, se divide en waves <=300/día y se difiere el resto sin coste.

### Flujo lead → newsletter
1. Lead entra por formulario/lead magnet.
2. Debe existir marketing_consent=true y evidencia de origen/fecha.
3. Se clasifica audiencia: PARTICULARES o INMOBILIARIAS.
4. CEREBRO genera idempotency_key por lead+audiencia.
5. Brevo upsert de contacto con updateEnabled=true.
6. Se añade exclusivamente a la lista Brevo de esa audiencia.
7. Baja, hard bounce o falta de consentimiento bloquean el alta.
8. Contactos antiguos requieren re-permiso; no se importan agresivamente.

### Dos newsletters semanales separadas
- newsletter_particulares
- newsletter_inmobiliarias

Nunca se mezclan audiencias. Cada edición exige al menos nueve bloques distintos:
1. Apertura editorial.
2. Actualidad.
3. Guía educativa.
4. Landing destacada.
5. Servicio destacado.
6. Caso práctico anonimizado.
7. Recurso/descargable/herramienta.
8. FAQ o mito.
9. CTA principal.

CEREBRO puede añadir bloques adicionales según actualidad, rendimiento, campañas, SEO, nuevas landings, estacionalidad y aprendizaje. El contenido de inmobiliarias se orienta a operaciones caídas/riesgo, filtro financiero, colaboración, recursos B2B y casos de operación; particulares a hipotecas, actualidad, educación financiera, herramientas, servicios y asesoramiento.

### Contratos nuevos
- `brevo_newsletter_contract.py`: consentimiento, audiencias, nueve bloques y quota planner.
- `brevo_newsletter_client.py`: adapter Marketing API sin secretos en código.
- `brevo_newsletter_composer.py`: HTML y campaign payload.
- `newsletter_enrollment.py`: evento lead consentido → lista Brevo.

### Gate físico pendiente antes de activar envío real
No hay evidencia viva en Git de:
- `BREVO_API_KEY` configurada en runtime;
- email remitente Brevo validado;
- autenticación de dominio SPF/DKIM/DMARC en Brevo;
- IDs reales de las dos listas.

Estos cuatro puntos son configuración, no rediseño. Hasta verificarlos `send_enabled=false`.


## Brevo · cierre físico PREPROD del transporte newsletter

Evidencia viva 28/09/2026:
- el secreto BREVO_API_KEY ya está configurado en el runtime PREPROD existente; no se expone;
- webhook Brevo PREPROD: health 200, configured=true;
- cuenta: Fénix Capital · plan free;
- remitente activo: hipotecas@fenixcapital.es;
- dominio fenixcapital.es: verified=true y authenticated=true;
- DNS Brevo: código TXT, DKIM1, DKIM2 y DMARC verificados;
- carpeta creada: FENIX_CEREBRO_NEWSLETTERS · id 16;
- lista PARTICULARES: FENIX_NEWSLETTER_PARTICULARES · id 17;
- lista INMOBILIARIAS: FENIX_NEWSLETTER_INMOBILIARIAS · id 18;
- canary de campaign draft: campañas 102 y 103 creadas en Brevo;
- emails enviados por el bootstrap: 0;
- contactos sintéticos usados durante pruebas: eliminados;
- endpoint temporal de bootstrap: retirado y protegido tras la prueba.

Se descubrió además una restricción del plan gratuito: el campo opcional campaign tag es rechazado. El composer canónico se ha corregido para NO enviar tag; no se ha comprado ni solicitado ningún plan.

### Consentimiento real del lead
La auditoría viva del plugin Fénix CEREBRO Leads 1.3.2 confirma que el payload ya contempla consent_marketing y el backend PROD persiste consentimiento_comercial para altas nuevas. Sin embargo, la captura genérica del navegador y el hook Elementor actual fuerzan consent_marketing=false. Por tanto NO se puede afirmar todavía que todo lead web entra automáticamente en newsletter.

Contrato cerrado:
- privacidad != consentimiento comercial;
- solo consent_marketing=true puede entrar en Brevo;
- /inmobiliarias/ -> lista 18;
- resto de leads consentidos -> lista 17;
- bajas, hard bounce y spam complaint quedan suprimidos;
- contactos legacy exigen re-permiso;
- la futura Landing Factory debe implementar este contrato, no inventar otro.

Esto evita activar marketing sin consentimiento y preserva PROD hasta pasar E2E de formulario en PREPROD.
