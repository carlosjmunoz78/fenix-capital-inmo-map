# CEREBRO OS · JARVIS · CUT35 · ACTIVACIÓN DEEPSEEK SEGURA

Fecha: 2026-11-06 · empresa fenix · motor JARVIS · entorno LAB · PROD NO-GO.

## HALLAZGO REAL

En `main` existen los workflows anteriores `.github/workflows/cerebro-deepseek-boost001-canary.yml`, `cerebro-deepseek-max-concurrency-v1.yml` y `cerebro-deepseek-super-audit-a00-a04.yml`, que hacen referencia al secreto de repositorio `DEEPSEEK_API_KEY`. Varios fijan baseline 100 USD o contrato de presupuesto 100 EUR y están preparados para solicitudes pagadas bajo sus respectivos gatillos. La autorización ACTUAL del propietario para JARVIS es un máximo ACUMULADO de 50 EUR, no 100 EUR.

GitHub Settings > Secrets and variables > Actions, inspeccionado en sesión autenticada: el secreto de repositorio `DEEPSEEK_API_KEY` no aparece entre los nombres visibles. No leer, recuperar, imprimir ni copiar valores de ningún secreto.

DeepSeek Platform sí está autenticado y mostraba una clave creada previamente, cuyo valor ya no se puede visualizar. Uso/balance en el panel: saldo recargado 98.23 USD y consumo 30 días 1.76 USD; NO equivale a gasto autorizado para JARVIS. La alerta de saldo estaba desactivada, y una alerta por sí sola NO es hard cap de facturación.

## DECISIÓN DE AISLAMIENTO

PROHIBIDO insertar `DEEPSEEK_API_KEY` como secreto a nivel de repositorio sin haber neutralizado/auditado todos sus consumidores antiguos: podría permitir llamadas de workflows con límites mayores que 50 EUR.

El lugar reservado es un GitHub **Environment Secret** de un entorno NUEVO exclusivo `JARVIS_DEEPSEEK_LAB`, al que los workflows heredados no hacen referencia. El secreto debe denominarse `DEEPSEEK_API_KEY`, crearse por usuario en GitHub y no pasar nunca por ChatGPT ni por archivos. Es NECESARIO crear una clave API independiente de uso LAB en DeepSeek (los valores de claves previas no se pueden recuperar por el panel).

Antes de cualquier ejecución de pago, hace falta preparar un workflow que declare explícitamente `environment: JARVIS_DEEPSEEK_LAB`, y que solo apunte a esta rama LAB. El token GitHub GITHUB_TOKEN debe ser de solo lectura salvo evidencia de necesidad de escritura; no añadir permisos PROD.

El runner LAB es finito, usa 24 casos sintéticos (12/día) y dos llamadas por caso; genera respuestas naturales reales (campo `respuesta`) y crítica estructurada, ahora con evaluación cualitativa. Aún NO es aprendizaje online persistente de pesos ni de voz. Toda propuesta es `CANDIDATE_ONLY`, nunca se promueve automáticamente.

El tope de 50 EUR se registra en contrato; el ejecutor tiene un límite acumulado adicional y más restrictivo de 40 USD y 5 USD por ejecución. No hay conversión EUR/USD certificada ni techo global proveedor: para certificar el presupuesto REAL se necesita historial y persistencia de gasto único, revisión de recarga automática, precio vigente y exclusividad de clave. Se exige fail-closed ante ausencia de ledger persistente. Un GitHub Runner temporal NO conserva ese ledger por sí mismo; no iniciar trabajo pagado automáticamente usando disco efímero.

## ESTADO

- HECHO: contratos de coste y bloqueo, casos sintéticos 24 y banco LAB, CI gratuita, evaluación de respuestas naturales, rama aislada y protección de main/App/CRM/PROD/CUT30.
- EXISTENTE: proveedor canónico `cerebro/runtime/deepseek-provider-v0.mjs`, presupuesto canónico, balance guard y pruebas; no crear un servidor o router adicional.
- BLOQUEADO: secreto de entorno exclusivo ausente, almacenamiento persistente para ledger aún no conectado a un job, scheduling de fin de semana sin default-branch ni proceso remoto existente.
- PROHIBIDO: disparar workflows antiguos de pago con baseline 100, añadir clave como secreto general, empezar suscripciones, recargas o créditos Work.

## PRÓXIMO PASO HUMANO MÍNIMO

Crear (solo una vez) el GitHub Environment `JARVIS_DEEPSEEK_LAB` en Settings > Environments y guardar dentro un NUEVO secret `DEEPSEEK_API_KEY` generado en https://platform.deepseek.com/api_keys. El dueño NO debe pegar la clave en el chat. Hasta entonces no se puede probar la API desde un runner autorizado.

Después: definir persistencia duradera de presupuesto (mejor vía JARVIS D1 europea aislada cuando CUT34 esté conectada), programador autónomo libre de `main`, smoke pagado único con coste medido inferior a un euro, y evaluación de conversación con 24 casos solo tras verificar saldo, clave y topes.

## Referencias

Workflow old main: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/main/.github/workflows/cerebro-deepseek-max-concurrency-v1.yml
Precios DeepSeek 2026-11-06: https://api-docs.deepseek.com/quick_start/pricing/
API saldo DeepSeek: https://api-docs.deepseek.com/api/get-user-balance/
GitHub schedule default branch: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax/
