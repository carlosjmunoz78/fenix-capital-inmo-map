# CEREBRO UMS-001 · Autonomía de encargos de imágenes · LAB V1

**Estados:** recepción automática en LAB **ACTIVA al escribir una orden válida en la rama**; planificación CEREBRO sin IA pagada; generación autónoma de pago **BLOQUEADA** hasta registrar presupuesto realmente prepagado y pruebas físicas end-to-end de QA/derechos. No modificar App/CRM/PROD, redes, Supabase, WordPress ni main.

## Recepción técnica real
Una nueva petición escrita bajo `requests/autonomous-inbox/*.json` en la rama aislada dispara un workflow `push`, sin mensajes manuales ni dependencias de Make, Notion Agents o suscripciones. Valida 22 campos exactos, empresa y entorno, una de las 11 piezas del briefing maestro, el motor consumidor original, el propietario creativo CEREBRO, formato y costes 0 € adicionales, 2 intentos máximos, proveedor permitido y prohibición estricta de recargas/publicación/vídeo. Guarda plan auditable, 11 prompts procedentes de la Fábrica existente y manifiesto en artefacto privado GitHub Actions. La fuente física es la rama LAB, no inventar que App/CRM recibe ya los archivos.

## Tribunal y entrega
`runtime/ums001_image_autonomous_intake_lab_v1.mjs` evalúa una pieza candidata con rubrica de 7 dimensiones, suma exacta, mínimo 88, sin violaciones, SHA del archivo físico, logotipo oficial verificado SHA, formato y titular canónicos, derechos de comercialización con prueba documentada y revisión editorial independiente. **Ni siquiera ese conjunto, por sí solo, habilita publicación**: solo admite propuesta de artefacto privado y requiere recibo de destino firmado. Un modelo que proclama 90/100 sin otras evidencias no pasa a entrega comercial.

Con 2/2 intentos rechazados, p.ej. `IG-STORY-01`, `HUMAN_REQUIRED(LOW_CONFIDENCE)` bloquea tercer intento; ningún bucle automático. `max_model_usd_per_attempt=0.03`, `max_qa_usd_per_attempt=0.02` como estimación con saldo prepagado; **no es certificación de saldo ni factura actual**.

## Evidencias reales y pendientes
- Imagen LinkedIn Seedream4 con postproducción auténtica y evaluación DeepSeek coherente 90/100; derechos/editorial aún no aprobados.
- Instagram Stories: dos pruebas 9:16 reales rechazadas, segunda score real 69 vs score comunicado 74. Prohibido nuevo intento automático.
- 9 predicciones físicas en 5 IDs; 6 IDs sin imagen generada.
- Sin ninguna pieza con derechos/editorial + entrega completa certificados; `IMAGE_GATE_GREEN=false`.
- No existe aún una conexión probada desde departamentos a LAB inbox ni flujo de generación/QA/postproducción/delivery por evento, ni saldo seguro para series sin coste adicional. **No declarar Productora autónoma para producción ni pasar a vídeo**.

## Próxima mejora tras este LAB V1
Conectar la entrada propia CEREBRO Gateway y Worker privado por token con cola transaccional (sin mover cargas pesadas a Supabase), hacer reserva única por cada POST de pago, verificar saldo con fuente de facturación, ejecutar generador compatible con cada ratio y un tribunal de dos evidencias independientes, publicar solo archivos de entrega privada al consumidor al recibir firmas criptográficas e integridad; exportar métricas y controlar retries. Probar real 11 formatos y promover por fases tras los gates. El sistema ya puede organizar encargos automáticamente en LAB sin nuevas llamadas de pago.

**Rollback:** revertir workflow+fuente+inbox nueva de PR45 DRAFT; no se cambió PR39, main ni ningún recurso existente.

## Integración LAB privada 2026-11-11 · V2 (conserva V1)

**HECHO (código + CI, NO servicio en producción):**
- Controlador de aceptación firmado `runtime/ums001_image_acceptance_controller_lab_v2.mjs`; rubric 88/100 con suma correcta; verifica SHA de bytes físicos, logo oficial, claims, derechos, cuatro firmantes independientes (VISUAL, FINISHER, RIGHTS, EDITORIAL) y acuse firmado de DESTINATION. Un certificado de un único LLM nunca basta.
- Nuevo registro transaccional SQLite `runtime/ums001_private_image_ledger_lab_v1.py` con `BEGIN IMMEDIATE`, WAL, concurrencia real, idempotencia por orden + predicción + destino, anti-reset por pieza y bloqueo ante POST incierto. No autoriza pagos, envíos a Replicate, publicaciones ni vídeo.
- Puente `runtime/ums001_private_order_bridge_lab_v1.mjs`: usa `planIntake` ORIGINAL de CEREBRO, registra solicitud en SQLite privado, incorpora solo imágenes existentes con SHA físico y Ed25519 del proveedor, exige HMAC del servicio interno para mutaciones, verifica el Tribunal existente con los archivos privados y solo registra confirmación privada cuando existe recibo independiente válido.
- Nunca guardar SQLite, journals, credenciales, claves, imágenes ni manifests sensibles en este repo **público**; `--db`, datos físicos y trust registry deben vivir fuera del checkout, en un runtime aislado y persistente. Un directorio temporal de GitHub Actions NO sirve como almacenamiento durable real.
- **Prueba real CI**: [43116064364](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43116064364), SUCCESS; **63/63 checks** (8 intake + 10 gate anterior + 16 aceptación firmada sintética + 20 SQLite + 9 bridge Node→SQLite), 0 fallos. Se detectaron y corrigieron en LAB dos defectos durante la primera ejecución: sombra de campos `status` y conflicto concurrente en inicialización WAL. No reescribir el baseline ni la PR #39.
- El test usa claves efímeras y pruebas sintéticas; no cuenta como evidencia de dos revisores reales ni firma real de proveedor. El uso comercial no está autorizado.

**PARCIAL y próximos gates físicos:**
1. Elegir el servicio de ejecución privado ya existente y su almacenamiento duradero (comprobar primero el repositorio privado de assets y Drive, pero NO moverlo ni duplicarlo por comodidad). Configurar secretos y firmantes con IAM/Vault y roles independientes. No introducir permisos públicos.
2. Conectar la cola real de CEREBRO Gateway a la entrada firmada, con idempotencia persistente; enlazar RESERVA FINOPS real y prueba de saldo prepago/auto-reload OFF antes de activar un solo `paidEnabled`. Actualmente `paidEnabled=false` en esta misión.
3. Sobre una imagen real existente con bytes accesibles: `provider proof → raw SHA → finisher SHA → visual QA → rights provenance → signed editorial → destination signed receipt → ledger`. Comparar OLD/NEW, comprobar 0 duplicados y restauración tras caída.
4. Completar física y visualmente 11/11 piezas en los seis formatos/canales y 1 campaña completa; no superar dos intentos sin intervención para piezas rechazadas. El historial V5 sigue siendo la base: 9 generaciones/5 IDs; 6 IDs sin generar; ningún derecho+editorial+entrega final certificado.
5. Restauración del ledger y almacenamiento, auditoría de claves/revocación, coste real y supervisión; solo entonces evaluar `IMAGE_GATE_GREEN`. Vídeo/caretas/publicación siguen OFF.

**HUMAN_REQUIRED:** únicamente las excepciones canónicas cuando exista evidencia concreta. Que falte un servicio privado real es **BLOQUEO TÉCNICO/PARCIAL**, no aprobación ficticia. Ningún contrato obliga a usar de forma pagada el modelo durante LAB.

**Rollback:** cierre de PR #45 DRAFT o reversión de commits LAB de esta integración. `main`, PR #39, App, CRM, WordPress, DNS, Cloudflare, SEO, publicaciones y vídeo no modificados.
