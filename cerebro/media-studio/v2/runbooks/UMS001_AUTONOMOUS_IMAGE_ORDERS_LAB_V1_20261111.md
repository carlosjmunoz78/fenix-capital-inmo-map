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