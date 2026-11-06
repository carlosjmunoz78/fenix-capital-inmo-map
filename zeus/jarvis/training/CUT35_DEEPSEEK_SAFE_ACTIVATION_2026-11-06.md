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

## CUT35 · Canario físico seguro preparado · 6 noviembre 2026

- **HECHO en GitHub:** `zeus/jarvis/training/jarvis-deepseek-lab-canary.mjs` utiliza el proveedor canónico `cerebro/runtime/deepseek-provider-v0.mjs` y sus costes canónicos. Solo una petición sintética, respuesta máxima 32 tokens; comprueba previamente el saldo DeepSeek frente al nivel USD 98.23 observado y el sublímite conservador USD 40. No ejecuta la aplicación, no escribe en PROD, ni toca D1.
- **HECHO:** override solo en la rama LAB, mismo path histórico `.github/workflows/cerebro-deepseek-boost001-canary.yml` para permitir `workflow_dispatch` con rama seleccionada. El archivo y SHA de **main siguen intactos**. El job exige `github.ref == refs/heads/cerebro/jarvis-deepseek-weekend-lab-20261106` y `environment: JARVIS_DEEPSEEK_LAB` con su secreto exclusivo; no usa repository secrets.
- **HECHO:** pruebas sin red incluidas en workflow `jarvis-deepseek-weekend-lab-ci.yml`, ejecutadas en GitHub Actions con clave explícitamente vacía. Última ejecución observada `Run 20`, SUCCESS tras corregir el mock del proveedor.
- **POR HACER:** crear en GitHub Settings > Environments el entorno exclusivo `JARVIS_DEEPSEEK_LAB` (actualmente solo existen Production, Preview y github-pages). Dentro, registrar una clave NUEVA de DeepSeek como secreto de ese entorno `DEEPSEEK_API_KEY`. NO usar Repository Secrets, NO revelar la clave, no poner en ningún log.
- **SIGUIENTE TEST DE PAGO:** solo después de configurar Environment, abrir workflow existente `CEREBRO DeepSeek BOOST-001 Tiny Canary`, seleccionar EXPRESAMENTE la rama `cerebro/jarvis-deepseek-weekend-lab-20261106` y ejecutar una vez. Nunca ejecutarlo desde main. La ejecución de hoy NO está realizada; cuenta no ha consumido nada en este corte.
- El canario NO activa aprendizaje del fin de semana: eso sigue requiriendo scheduler remoto y persistencia del ledger de 50 EUR, además de posterior evaluación de propuestas. No confundir activación del API con aprendizaje ya operativo.

## Verificación física adicional · 2026-11-06

**HECHO:** GitHub `Settings > Environments > JARVIS_DEEPSEEK_LAB` (environment_id `26485940695`) existe y su selector muestra `Selected branches and tags` con `1 branch and 0 tags allowed`. La única regla visible es la rama exacta `cerebro/jarvis-deepseek-weekend-lab-20261106`, con el texto `Currently applies to 1 branch`. La restricción fue comprobada en la interfaz autenticada después del cambio del propietario.

**BLOQUEADO:** El mismo panel dice `This environment has no secrets.`. Por ello no existe `DEEPSEEK_API_KEY` operativo en el environment. No se ha creado ni copiado ningún valor de clave, ni se ha realizado una petición pagada.

**NO MODIFICADO:** `main`, PR #25, CUT30, App, CRM y sistemas de producción. Código del canario de pago permanece en rama aislada y sin lanzar.

**Único paso de credencial:** generar una clave DeepSeek independiente en el panel autenticado y guardarla directamente en GitHub `JARVIS_DEEPSEEK_LAB > Add environment secret` bajo el nombre `DEEPSEEK_API_KEY`. Nunca compartir valor por chat ni colocarlo como Repository Secret (los workflows antiguos podrían usarlo). Tras ello ejecutar un único canario de coste mínimo con control de branch y saldo, sin habilitar todavía el programa repetitivo.


## CUT36 · Estudio conversacional aislado · 2026-11-06

**HECHO**: después de CANARY_PASS en la ejecución real #42245878611, creado jarvis-deepseek-study-lab.mjs con 6 casos sintéticos, máximo 12 llamadas pagadas y límite preventivo por ejecución USD 0.15. No es entrenamiento de pesos ni mejora conversacional demostrada: genera candidatos, crítica, riesgos, coste y estado de revisión.

**HECHO**: el adaptador LAB usa el proveedor canónico cerebro/runtime/deepseek-provider-v0.mjs sin modificarlo. Envía DeepSeek Responses API en modo JSON y sin pensamiento prolongado. Verifica antes de cada llamada saldo y presupuesto, aplica comparador conservador de descenso de saldo compartido desde USD 98.23 inicial y subtope acumulado USD 40. No equivale a bloqueo global del proveedor ni a certificación cambiaria EUR/USD.

**HECHO**: rama LAB conserva el mismo workflow ya probado cerebro-deepseek-boost001-canary.yml, ahora con ejecución de estudio de seis escenarios solo por workflow_dispatch manual, requiere secreto de entorno JARVIS_DEEPSEEK_LAB y exacta rama aislada. Envía artefactos sintéticos de revisión con checkpoints parciales de coste, retenidos 30 días. GitHub Actions offline Run 29 SUCCESS, sin nueva llamada real por estas modificaciones.

**PENDIENTE**: un nuevo disparo manual del workflow https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/workflows/cerebro-deepseek-boost001-canary.yml, seleccionando exactamente cerebro/jarvis-deepseek-weekend-lab-20261106. El workflow histórico de main no ha cambiado y NO debe lanzarse. Una vez exista el lote real, revisar sus respuestas, errores y coste antes de decidir promoción o extender cohortes. No hay programación autónoma activa.

**SIN TOCAR**: PR #25, main, CUT30, Cloudflare Worker, D1, App, CRM, DNS, PROD, Trading.
