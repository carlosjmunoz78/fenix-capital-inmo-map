# UMS-001 · Auditoría y cierre parcial de postproducción multiformato · 11/11/2026

**Resultado:** Productora de imágenes todavía **NO AUTÓNOMA**. CEREBRO conserva fábrica creativa; DeepSeek es mentor/evaluador temporal; Replicate genera con saldo prepagado. No fusión, producción, publicación ni vídeos.

## Trabajo HECHO hoy
- Auditoría real de PR #45, los siete outputs de proveedor y la matriz de once piezas.
- Confirmación desde el manual original de Fénix Capital (2025): paleta #222222 / #870064 / #FFB71B / #FF5F00; **Montserrat solamente para logotipo**, no para títulos de publicidad; logo requiere espacio de respeto y tamaño legible.
- Nuevo módulo aditivo, sin reemplazar los compositores existentes: `runtime/ums001_multichannel_brand_finish_lab_v1.py`. Acepta once formatos y verifica el SHA256 original del JPEG, la proporción nativa, el logo original `FENIX_OFFICIAL_01` mediante SHA256 y los textos comerciales.
- Pruebas offline de 11 formatos y seguridad **VERDES**. Publicación, entrega y vídeo permanecen falsos por contrato.
- **Prueba física sin nueva inferencia:** reutiliza imagen real Seedream4 LinkedIn de run #43058501615; recorte a 1200×628, logo exacto de marca verificado y titular de la orden. Primer export detectó visualmente **texto cortado**, por lo que se corrigió e incorporó una prueba de caja de texto y zona segura. Segunda ejecución física #43092131819 **SUCCESS**, imagen y manifiesto QA guardados en artifact #13889177164. Imagen de salida SHA256 `5e65cfc30f9cdee5c8e9a93942d05e85a3f1e362d66fd623689525b8b7b2e170`.
- PR #45 DRAFT, solo LAB, coste de proveedor **0 USD en este cambio**.

## Lo que impide decir «genera imágenes perfectas sola»
1. El tribunal DeepSeek devolvió schema inválido en el único candidato visual Seedream; no existe un QA independiente 88/100 acreditado. El nuevo exportador no inventa puntuaciones.
2. Seis imágenes FLUX rechazadas; una imagen LinkedIn mejor, pero sus derechos/claims/editorial no están acreditados. No confundir verde técnico con verde artístico.
3. Siete de las once **piezas distintas** no se han generado. Hay siete generaciones reales en total, repartidas entre cuatro IDs.
4. La postproducción real se ha probado con imagen física **solo en LinkedIn**. Otras dimensiones están cubiertas por pruebas, pero no tienen aún QA visual física.
5. Entrega por departamentos y registro permanente de derechos, variaciones, costes y rollback E2E no está demostrado.

## Siguiente orden condicionado
Reparar la salida estructurada DeepSeek mediante un contrato de rubric con suma exacta y cero promociones ante respuesta incompleta. Probar sin llamadas al generador, conservando raw SHA y evidencia original. Al superar el tribunal, generar solo piezas inéditas con límites individuales 1-2 intentos y sin autorrecarga; aprobar cada canal con pruebas físicas/visuales. Entonces probar una campaña de 11 piezas completa, derechos, logos y entrega, con rollback.

**No iniciar vídeo ni caretas de salida mientras el gate no esté VERDE**. El siguiente gate es `IMAGE_GATE_GREEN`; la única salida aquí es `*_QA_REVIEW_ONLY`. El usuario no ha pedido aprobar ninguna pieza deficiente.

Informe máquina: `qa/UMS001_MULTICHANNEL_IMAGE_GATE_REAL_20261111_V4.json`.