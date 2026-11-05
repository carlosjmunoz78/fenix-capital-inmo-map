# CEREBRO OS · FACT-001 · Productora Audiovisual OpenAI · Integración SOC-001 Facebook · 2026-11-05

## 0. Verdad de estado

- **EXISTENTE:** FACT-001 tiene cola transaccional `cerebro_creative_job_v1`, despacho OIDC `cerebro-creative-dispatch-v1`, GitHub Actions `cerebro-creative-job-runner-v1.yml` y bucket privado `cerebro-creative-assets`. El renderizador Chromium/FFmpeg produjo imágenes/carruseles/reels físicamente (octubre 2026), pero su diseño programático es demasiado plano para el estándar de una agencia creativa superior.
- **PROBLEMA:** `fenix-openai-images-test` antiguo utiliza `gpt-image-1`, retirado el **23/10/2026** según API oficial. No reactivar esa versión.
- **HECHO EN RAMA PARALELA:** código de prompt `creative-social-prompt-v0.mjs`, adaptador OpenAI `creative-openai-image-adapter-v0.mjs`, composición `creative-social-compositor-v0.mjs`, wrapper `creative-ai-job-v0.mjs`, ampliación del worker existente `creative-job-runner-v1.mjs`, fixture de briefing y test físico. **No se ha modificado producción.**
- **PROBADO FÍSICAMENTE:** tests de Node/GitHub Actions con proveedor simulado, composición con Chromium, alfa de logotipo de prueba, protección de coste antes de red, 1080×1080, autenticación OIDC simulada y regresión del worker original.
- **NO REALIZADO:** pago/OpenAI API real, generación de fotografía real por FACT-001, comprobación semántica independiente en la nueva foto, consumo de presupuesto, conexión de la cola nueva en PRODUCCIÓN, publicación Facebook nativa. No declarar autonomía.

## 1. Flujo de trabajo objetivo

SOC-001 investigación/estrategia → SOC-001 copywriting/embudo (hook, CTA, hashtag, destinatario, URL web oficial) → encargo de Productora Audiovisual registrado en FACT-001 → compilador genera *prompt de escena fotográfica* → Model Router selecciona `gpt-image-2.5-flare` si credencial, presupuesto y coste medido están operativos; si no, `HOLD` técnico o `MONEY_LIMIT` al superar el presupuesto, sin imponer proveedor gratuito → OpenAI genera **solo fotografía**, sin texto ni logo → compositor añade **logotipo PNG oficial**, texto verificado, identidad naranja protagonista y morado mínimo → supervisor + tribunal **independientes** verifican calidad fotográfica, tipografía, derechos, claims hipotecarios y embudo → activo privado con SHA-256 y registro de origen → adaptador SOC-001 autorizado (Buffer existente, Make existente o navegador futuro) → post nativo con permalink → métricas y aprendizaje.

**Importante:** WordPress es almacén/adapter, nunca director audiovisual. STAGING solo para pruebas; todos los enlaces públicos a `https://fenixcapital.es/`.

## 2. Matriz de protección

- No cambiar `app.fenixcapital.es`, CRM real, WP PROD, motores actuales, cron ni Buffer.
- Contrato viejo siempre disponible (OLD vs NEW). Rama independiente, sin despliegue hasta PREPROD completo.
- Multiempresa: no permitir `company_id` distinto de perfil realmente registrado; fallo de seguridad si no corresponde.
- Seguridad: acceso a OpenAI desde worker privado, API key solo variable de entorno y nunca en chat/log/UI.
- Dinero: *OpenAI API es de pago por consumo y su precio varía con tokens/modelo/calidad*. Esta primera etapa ejecuta **0 llamadas y 0 € de gasto API**; una prueba real requiere un presupuesto autorizado y ledger auditable; no requiere aprobación individual del propietario cuando el importe está cubierto.
- No fingir presupuesto 0 en una ejecución pagada. La cola original fuerza `expected_cost_eur=0`; por eso no debe usarse para procesar pagos. El wrapper devuelve **HOLD** sin invocar proveedor; se requiere ruta separada con autorización y contabilidad.
- Un fallo de red ambiguo tras llamar OpenAI no debe permitir reintento automático susceptible de doble cobro. Registrar reclamación/reserva e idempotencia antes del POST y reconciliar luego.
- Imagen con fachada generada será **conceptual ilustrativa**, nunca un inmueble anunciado ni edificio exacto de Córdoba sin evidencia.
- El logotipo auténtico se añade después; jamás pedir al modelo que genere/reinterprete el logo oficial.

## 2.1. POLÍTICA ECONÓMICA CORREGIDA POR EL PROPIETARIO · 05/11/2026

**Esta sección prevalece sobre cualquier formulación anterior de coste cero aplicada a imágenes o vídeos.**

- **Imágenes IA: gasto permitido**; OpenAI es el proveedor inicial ya utilizado por la empresa. Verificar credenciales reales, disponibilidad del modelo y presupuesto operativo sin imprimir ni mover secretos.
- **Vídeos IA: gasto permitido también**, aunque **todavía NO existe una API de vídeo contratada**. No inventar conexión ni facturación; registrar candidato y mantenerlo en HOLD hasta activación autorizada.
- FLUX1.1 [pro] es el siguiente proveedor previsto, pero **no está conectado todavía**. Su precio de referencia publicado es **0,04 USD por imagen**; consultar tarifas y condiciones actuales antes de compararlo. También pueden incorporarse otros proveedores.
- **El selector de CEREBRO elige el proveedor de menor coste entre los que superan una evaluación de calidad independiente** (fotorealismo, resultado para redes, instrucciones del prompt, identidad, legalidad y derechos). No adjudicar solo por ser barato.
- No exigir aprobación humana **por cada imagen** si existe presupuesto vigente ya autorizado, límites cuantitativos y un sistema que reserve gasto y registre resultados. Intervención humana `MONEY_LIMIT` cuando falta el límite económico, hay discrepancia o se supera el presupuesto.
- Las herramientas y procesos generales siguen con preferencia **0 € adicional**. Las categorías de **imagen y vídeo están expresamente excluidas de esta prohibición**, sin exigir una nueva suscripción.
- El viejo procedimiento `cerebro_creative_enqueue_v1` aún valida `expected_cost_eur=0`. No falsear ese dato para ejecutar OpenAI; crear o completar una vía paralela de pagos con ledger y reserva atómica antes de activarla. Hasta entonces la integración de OpenAI de esta PR sigue preparada pero **no ejecutada con coste real**.
- Precio, divisa y calidad son evidencias medibles por solicitud. No suponer que dólares son euros; verificar el cambio cuando haya comparación entre tarifas.
- Contrato automatizable: `cerebro/runtime/creative-media-provider-policy-v1.mjs`.
- Fuentes oficiales: [OpenAI Images API](https://developers.openai.com/api/reference/resources/images/methods/generate), [BFL modelos y tarifa FLUX1.1](https://help.bfl.ai/articles/7655484417-what-flux-models-are-available).

## 3. Aceptación física: no basta el CI verde

1. Probar bajo un máximo de gasto aprobado, con autorización de propietario, presupuesto, journal de coste e idempotencia.
2. Registrar llamada real `/v1/images/generations` con modelo soportado, ID de solicitud, retorno PNG y SHA.
3. Ejecutar compositor con el **logotipo real**; validar alfa por píxeles y superficie clara.
4. Comparar creatividades nuevas con referencias profesionales. El tribunal debe poder **rechazar** diapositivas planas y diseños de poco valor.
5. Copys con hook/cuerpo/CTA/hashtags y embudo TOFU/MOFU/BOFU, enlaces HTTP 200 a web oficial, tracking UTM.
6. Guardar en bucket privado / crear manifiesto con derechos, gastos reales, audit log; activar revisión independiente.
7. Tras superar QA, entrega a SOC-001, no a la API social sin autorización.
8. Comprobar una publicación nativa con ID/permalink, no solo una respuesta HTTP del cron.
9. Configurar reabastecimiento diario 7/7 y aprendizaje basado en métricas, no plantillas repetidas.

## 4. Roles, mérito y sustituciones

Los agentes de producto/redes redactan estrategia y copy; AV crea escena, composición, postproducción y variantes; EVA/Tribunal independiente supervisa.
Todos, incluidos supervisores, directores y tribunal, tienen scorecards, pruebas, premios por calidad verificada, reentrenamiento, reexamen y sustitución OLD vs NEW con rollback. Nadie se autopremia ni autoriza gasto propio.

## 5. Pruebas y continuidad

PR de esta rama: `https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/23`. 
PR de Facebook suministro original: `https://github.com/carlosjmunoz78/fenix-capital-cerebro-social/pull/7`.

`node --test cerebro/tests/creative-openai-social-bridge-v0.test.mjs`

Workflow: `.github/workflows/cerebro-openai-image-bridge-v0.yml`.
Ultima prueba verificada (integración física simulada): `https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42008055117` (SUCCESS). Reevaluar la ejecución más reciente antes de promoción.

## 6. Recuperación/rollback

Al no modificar PROD ni reemplazar el generador anterior, basta con no fusionar la PR y mantener seleccionado el renderer actual (eso no garantiza que su diseño sea bueno, solo preserva compatibilidad). Si se activa en PREPROD y falla, detener y devolver a HOLD; jamás borrar trabajos o adjuntos de otros motores.
