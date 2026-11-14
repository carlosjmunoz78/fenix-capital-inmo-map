# CEREBRO OS · SEO ENTERPRISE V2 · TRASPASO TOTAL DE CONTINUIDAD

**Corte:** 2026-11-06, sesión de continuación de ChatGPT. **Empresa:** Fénix Capital (Córdoba). **Acceso técnico:** GitHub, Supabase PREPROD/PROD por conector, WordPress PROD por Cowboy MCP web, Biblioteca de ChatGPT. **Foco único ahora:** cierre del checklist descargable y entrega transaccional, sin riesgo para operación existente.

## 1. DESTINOS CANÓNICOS Y ESTADOS

| Elemento | Identificador | Estado real en el corte |
|---|---|---|
| PR SEO | https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/22 | **OPEN DRAFT, UNMERGED**; cabeza antes de este traspaso `6dd8c9d05acb01538bc5fa60999aa6726caf2f67` |
| Rama | `cerebro/seo-enterprise-family-staging-contract-v1-20261105` | Escrituras únicamente aditivas y paralelas |
| Repositorio | `carlosjmunoz78/fenix-capital-inmo-map` | No tocar main sin gates |
| Estado SEO | `cerebro/docs/CEREBRO_SEO_ESTADO_VIVO_CONTINUIDAD_2026-11-06.md` | Último estado verificado |
| Informe imagen/embudos | `cerebro/seo-enterprise/v2/evidence/SEO_PREMIUM_IMAGE_AND_FUNNEL_GATES_2026-11-06.md` | Compositor premium y separación lógica green en PREPROD |
| Informe entrega | `cerebro/seo-enterprise/v2/evidence/SEO_CHECKLIST_BREVO_DELIVERY_PREPROD_GATE_2026-11-06.md` | PDF V1 email mock, ledger instalado, E2E no realizado |
| Registry | `cerebro/seo-enterprise/v2/registry/seo-creative-and-funnel-extension-v1.registry.json` | Capacidades, gates y rollback |
| Supabase PROD | `cluhljgonannaafpmblx` | App/CRM/funciones protegidas, sin mutaciones en esta fase |
| Supabase PREPROD | `hnqlnvakzaywtafeiybt` | Solo PREPROD del proyecto Supabase, **no existe App PREPROD** |
| Bucket | `storage.buckets.id=seo-preprod-assets` en PREPROD | **Privado, sin checklist subido** |
| Ledger | `public.cerebro_seo_checklist_delivery_v0` en PREPROD | RLS on, anon/auth sin SELECT/INSERT, service_role con SELECT/INSERT/UPDATE; 0 registros |

**Última comprobación live de Supabase de este traspaso:** `ledger_rows=0`, `pdf_objects=0`, `private_bucket_public=false`. No afirmar que V2 esté subido ni que se hayan enviado emails.

## 2. HISTORIA QUE NO SE DEBE REPETIR

### SEO general y estructura de funnels
- Inventario existente de 2026-11-05: 166 páginas, 34 posts, 629 medios; reutilizar sin nuevas auditorías de toda la web.
- Estrategia preparada para 200 URL, 8 funnel contracts, 24 pares de landing B2B/B2C, 7 focus keywords pendientes; 32 departamentos SEO están definidos pero **no** equivalen a 32 departamentos autónomos en PROD. Tests SEO antiguos 154/154 PASS, asociados a SHA anterior; no trasladar certificación a commits posteriores automáticamente.
- Home `/` y `/inicio/` HTTP 200, ambas canonical preferida `/`, metatítulos iguales. Mantener, evaluar GSC gratuitamente antes de 301/noindex. No pagar GSC Wizard (suscripción/trial no disponible).
- WordPress post 52656 **DRAFT**: "Checklist para visitar un piso en Córdoba antes de pedir una hipoteca". CTA existente hacia calculadoras `/precio-maximo/`, `/gastos-compra/`, `/que-piso-te-puedes-permitir/`, todas respondieron 200. Falta formulario/download/e-mail entrega de verdad.
- Post WP 960 sobre hipotecas autónomos en Córdoba sigue publicado, con imagen antigua. **No** editar/publicar o cambiar imagen sin QA completo.

### Productora audiovisual
- Job original SEO `c4012f43-c12f-400b-9610-2e5f2e286000`, en Supabase PROD, fue `SUCCEEDED` tras identificar GitHub Action `disabled_fork` y realizar un despacho puntual. Salida 1200×630, 0 €; NO se volvió a publicar en WP y se retuvo por QA de fuente/branding.
- Workflow legacy `cerebro-creative-job-runner-v1.yml` devuelto a **disabled_manually** para evitar ~288 ejecuciones diarias vacías; no reactivar sin scheduler ligero. Test diagnóstico GitHub run 42131416618, run despacho puntual 42131964855 y worker 42131975709.
- Compositor premium PREPROD `cerebro/seo-enterprise/v2/runtime/seo-premium-creative-v1.mjs` con logo oficial y Montserrat, 1200×630, digest PNG `2f042f9a5833560e6f693a76768d0a73eb22ef8267ddf07f0c24578bd5aa72a8`, PASS 3/3 en run 42134348550. Pendiente tribunal de calidad editorial y publicación.

### Formularios y leads
- Montilla B2C post 49114 (`/asesor-hipotecario-montilla/`) y Montilla B2B post 49128 (`/financiacion-compradores-inmobiliarias-montilla/`) comparten shortcode legacy `[fenix_seo001_city_form city="Montilla" funnel="STUDY"]` y resource `study_montilla`.
- Contrato separado en `seo-lead-segmentation-contract-v0.mjs`: particulares `study_b2c_montilla`, inmobiliarias `partner_b2b_montilla`, newsletter separados y consentimiento de privacidad vs marketing. CI 5/5 en run 42134348772; **sólo lógica PREPROD**, WP/CRM actuales no modificados.
- Captura actual WP: `cerebro-seo001-city-form-prod` + `fenix-cerebro-leads` → `fenix-web-lead` → ingestión/CRM y avisos. Edge `fenix-web-lead-alert-worker` usa Brevo `/v3/smtp/email` para alertas internas, **no** entrega automatizada del checklist al comprador.
- Endpoints Brevo legacy `fenix-brevo-lead-webhook` e `fenix-brevo-inventory-once` están retirados (implementación 410). No reactivarlos. No asumir listas Brevo dobles ni newsletter E2E.

### Checklist, PDF, correo y ledger
- PDF V1 preexistente `/mnt/data/FENIX_CHECKLIST_VISITA_PISO_CORDOBA_BORRADOR_V1.pdf`: **99.419 bytes, 2 páginas, 33 campos AcroForm, SHA256 `59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6`**.
- PDF V2 creado en esta continuidad y verificado físicamente: `FENIX_CHECKLIST_VISITA_CORDOBA_MARCA_V2_PREPROD.pdf`, **113.703 bytes, 2 páginas, 33 campos, SHA256 `82a96dc9b1c64bf8972e44358cd5bdc121182a09aa3832b71162efc7bea7e660`**, logo negativo original del manual de marca Fénix, página 8, colores charcoal/orange/yellow, enlace de contacto. Diseño PREPROD pendiente QA editorial/branding/legal formal. V1 no se reemplazó.
- **CRÍTICO:** `seo-checklist-transactional-delivery-v0.mjs` y tabla 
`cerebro_seo_checklist_delivery_v0` todavía están **pinned a V1** (99.419 bytes y SHA `59e...`). No subir V2 y pretender usarla con el adaptador actual. Crear contrato V2 paralelo y test de integridad/rollback; nada de alterar historial V1.
- `.eml` de ensayo local con PDF V1 verdadero adjunto `SEO001_CHECKLIST_PREPROD_CORREO_DE_PRUEBA_NO_ENVIADO.eml`; MIME desmontado y el digest de adjunto coincidió con V1; destinatario ficticio `test-checklist@example.invalid`. **CERO email enviado**.
- Adaptador transaccional `seo-checklist-transactional-delivery-v0.mjs`: validación strict tenant/persona/evento/consentimientos, PDF bytes y SHA, email Brevo con PDF adjunto, sin contacto/listas comerciales, `DRY_RUN` predeterminado. Exige allowlist, ledger y API key para test real; aún no hay prueba 201/messageId ni inbox.
- Supabase PREPROD: SQL aditivo `seo-checklist-delivery-ledger-preprod-v0.sql` instalado. Tabla con UNIQUE y RLS, no email/teléfono en claro; prueba BEGIN/ROLLBACK de reserve → duplicate denied → accepted → unknown denied. Conector `seo-checklist-ledger-supabase-v0.mjs` probado. GitHub Actions CI #42174299373 **10/10 PASS**; run 42173071584 **6/6 PASS**. No significa servicio online.
- El asesor de Supabase señala RLS sin políticas públicas, **deliberado** por grants revocados a anon/authenticated.

## 3. ÚLTIMA OPERACIÓN / BLOQUEO EXACTO

La ejecución previa verificó y mostró visualmente PDF V2. Se examinó si los conectores podrían subir binarios directamente al bucket privado, y **no existe en el conector Supabase expuesto una herramienta de upload de storage**. Se exploró un puente de transferencia hacia Adobe, **sin prueba confirmada de subida ni de transferencia a Supabase**; no darlo por concluido.

**Siguiente acción práctica:** usar ChatGPT Work (navegador de nube y sesión autenticada Supabase) para subir localmente el PDF V2 de la Biblioteca al bucket `seo-preprod-assets` en el proyecto `hnqlnvakzaywtafeiybt` **solo si** puede realizarse de forma privada, con nombre versionado, `upsert:false`, sin URL pública, y verificar después los bytes/sha del objeto. Alternativa: camino técnico con usuario autenticado y firmado, sin filtrar credenciales ni claves al chat. No crear otro bucket ni mover el recurso a Adobe público.

Después, preparar `CHECKLIST_DELIVERY_V2` separado de V1 (asset id, path, tamaño, hash V2), probar código y tabla en PREPROD con owner/server verification; no fakear event provenance. Probar una única entrega a buzón de control real, permitido, con consentimiento y receipt. Solo promover a WordPress post 52656 cuando QA + tribunal, backup y rollback estén demostrados.

## 4. PROCEDIMIENTO DE EJECUCIÓN CEREBRO / ANTI-LOOP

**No romper existente**: inventario, dependencias, snapshot, contratos, tests OLD, nueva implementación paralela, PREPROD aislado, OLD vs NEW, rollback ensayado, promoción gradual. La regla: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

**FACTORY FIRST / multiempresa**: todas las capacidades llevan `company_id`, `engine_id`, `environment`, `version`, propiedad tenant, consentimiento y costes. No 150 servidores; motores lógicos con runtime compartido. App/CRM/WordPress PROD protegidos. Trading LAB aislado. No WPVibe, no Make para esto, no nuevos pagos sin ROI. No suscripciones IA.

**Cómo ejecutamos**: (1) leer el último estado canónico; (2) comprobar sistema vivo por conectores, no suposiciones; (3) modificar la PR DRAFT o PREPROD solo cuando esté justificado; (4) lanzar tests reales, comparar contra viejo y reparar rojo; (5) comprobar SQL/HTTP/artefacto físico, no confundir dry-run con entrega; (6) registrar commit, run, sha, coste, permisos y rollback; (7) continuar sin reinvestigar lo certificado.

**Gate human by exception** exclusivamente LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST. Un test no demuestra un despliegue. Ningún listado GSC de pago, cliente real o modificación SEO destructiva sin gates.

## 5. FALTANTES OBJETIVOS CON ESTADO

| Bloque | Estado |
|---|---|
| Archivo PDF V2 de marca generado y verificado localmente | HECHO |
| Subida privada Supabase PREPROD | PENDIENTE: objeto inexistente |
| Contrato de hashes V2 paralelo | PENDIENTE: runtime actual fijado a V1 |
| Ledger PREPROD privado e idempotente | HECHO; tabla física vacía, runner no conectado a mailer real |
| Email MIME V1 adjunto sin red | HECHO EN LAB, no envío |
| Brevo a buzón de pruebas real | PENDIENTE, 0 mensajes |
| Vincular evento servidor verificado → ledger → Brevo | PENDIENTE |
| Formularios B2B/B2C + newsletter E2E | PENDIENTE |
| Publicar post 52656 y entregar PDF a particulares | BLOQUEADO: QA, E2E, autorización de publicación |
| Modelo de autonomía 24/7 de estos motores | PENDIENTE |
| Estado PR #22 | DRAFT, NO FUSIONAR |

## 6. DOCUMENTOS DENTRO DE ESTE PAQUETE

- `PROMPT_CONTINUAR_CEREBRO_SEO_2026-11-06.md` para pegar en el próximo chat del mismo proyecto.
- `CEREBRO_SEO_ESTADO_MAQUINA_2026-11-06.json` estado legible por IA.
- `FENIX_CHECKLIST_VISITA_CORDOBA_MARCA_V2_PREPROD.pdf` nueva versión de marca, no publicada.
- `FENIX_CHECKLIST_VISITA_PISO_CORDOBA_BORRADOR_V1.pdf` original intacto.
- `SEO001_CHECKLIST_PREPROD_CORREO_DE_PRUEBA_NO_ENVIADO.eml` local MIME test, NO enviado.
- `SEO001_BRANDED_PDF_V2_QA.json` y `SEO001_DELIVERY_MIME_QA.json` evidencias locales, sin secretos.

**Criterio de salida para el nuevo chat**: dejar entrega de checklist realmente conectada en PREPROD con prueba física e idempotencia, sin publicarla ni declarar PROD mientras no existan QA/tribunal/rollback/permisos; preservar todo lo existente y actualizar la Biblioteca y GitHub con nuevo estado exacto.