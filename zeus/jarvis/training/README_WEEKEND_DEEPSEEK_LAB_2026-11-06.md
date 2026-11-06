# JARVIS · DeepSeek Weekend LAB · 7–8 noviembre 2026

**Estado:** CÓDIGO PREPARADO / API NO CONECTADA / EJECUCIÓN NO ACTIVADA / PROD NO-GO.
Ámbito: company_id=fenix, engine_id=JARVIS, environment=LAB, version=WEEKEND_2026_11_07_08.

## Finalidad y límites

- Aprendizaje evaluado de candidatos sintéticos, NO entrenamiento de pesos ni promoción automática de conocimientos.
- Presupuesto declarado por el propietario: 50 € prepagados. Saldo NO VERIFICADO, SIN recargas, SIN cuotas ni pagos nuevos.
- Modelo DeepSeek oficial: deepseek-flash; tarifas fin de semana off-peak, pero runner reserva con tarifas pico.
- El runner limita a 4 casos, 8 llamadas, 1 USD de coste estimado por ejecución y bloqueo local de un arranque por día; para ambos días, máximo 2 USD atribuibles al runner SI el directorio de estado se conserva, hay una sola instancia y no hay otros consumidores. No hay garantía de gasto máximo de la cuenta DeepSeek sin control externo de facturación.
- Ocho casos exclusivamente sintéticos. Nunca enviar PII, secretos, clientes, datos reales, grabaciones o credenciales.
- Propuesta + crítica, evaluación determinista y artefactos CANDIDATE_ONLY. Fuentes, pruebas y tribunal son requisitos antes de promover.
- Sin escrituras D1, Supabase, Gateway, Worker, App/CRM, main, CUT30, PR25, PROD ni Trading.

## Archivos y modo offline

- deepseek-weekend-20261107-08.curriculum.json: 8 casos sintéticos.
- deepseek-weekend-runner.mjs: Node >=20, sin paquetes; --dry-run por defecto, --execute exige habilitación expresa, clave segura y saldo, solo fechas 7–8 nov. Consulta /user/balance antes de inferir, salida privada, sin reintentos automáticos ni logs de secretos.
- deepseek-weekend-runner.test.mjs: pruebas offline, no ejecutan llamadas pagadas.

Comandos desde la raíz de la rama aislada:

    node --test zeus/jarvis/training/deepseek-weekend-runner.test.mjs
    node zeus/jarvis/training/deepseek-weekend-runner.mjs --dry-run

Comprobaciones aisladas realizadas en el entorno del asistente: parser y 5 invariantes de presupuesto, saldo, no autopromoción y dry-run PASS. CI/Node completo: PENDIENTE. No se ejecutaron llamadas DeepSeek reales.

## Bloqueos físicos reales, viernes 6 de noviembre

1. No se ha verificado una credencial DEEPSEEK_API_KEY utilizable en runner seguro ni el saldo de 50 €; secreto no figura entre los nombres de GitHub Actions Secrets del repositorio consultados.
2. No hay control de ejecución del Cloudflare/PC oficina disponible en este chat, y no se permite modificar main.
3. GitHub Actions schedule solo ejecuta workflows desde la rama predeterminada, no desde esta rama LAB. No añadir cron engañoso a la rama.
4. El plan ChatGPT tiene cinco automatizaciones activas y rechazó la sexta por límite; no se alteraron tareas existentes.

## Activación futura, solo tras superar gates

- Configurar DEEPSEEK_API_KEY como secreto del runner de ejecución, NO en chat ni commit.
- Confirmar saldo por /user/balance, ausencia de autorrecargas, coste global y límites del crédito. No compartir key ni usar la cuenta simultáneamente desde otros agentes.
- Usar almacenamiento privado persistente para JARVIS_WEEKEND_OUTPUT_DIR, puesto que el bloqueo de una ejecución diaria depende de él.
- Solo sábado 7 o domingo 8, habilitar JARVIS_WEEKEND_ENABLE=1 en el entorno del runner y ejecutar: node zeus/jarvis/training/deepseek-weekend-runner.mjs --execute.
- Conservar candidatos privados; evaluación independiente, tests de regresión, tribunal, coste, backup y rollback antes de usar cualquier conocimiento.

Documentación oficial: https://api-docs.deepseek.com/api/get-user-balance/ ; https://api-docs.deepseek.com/quick_start/pricing/ ; https://docs.github.com/actions/reference/events-that-trigger-workflows#schedule

NO declarar ACTIVADO, APRENDIENDO ni PROD sin prueba real. CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## Autoridad presupuestaria y estado verificado el 6 de noviembre de 2026 (CUT35)

**NUEVA AUTORIZACIÓN DEL PROPIETARIO: presupuesto máximo agregado de 50 EUR para el programa de mejora de conversación/comprensión JARVIS. NO es una orden de consumirlos íntegramente.**

**HECHO en GitHub:** `deepseek-lifetime-budget.mjs` y su integración en `deepseek-weekend-runner.mjs`, con reserva persistente ANTES de la petición, límite monetario técnico adicional de 40 USD de presupuesto acumulado del ejecutor, máximo 5 USD por ejecución diaria, sin recargas automáticas ni promoción de resultados. Este segundo límite es deliberadamente más restrictivo; **no es un conversor EUR/USD garantizado ni un límite de facturación global del proveedor**. Requiere `JARVIS_WEEKEND_OUTPUT_DIR` privado y persistente; cambio de directorio, eliminación de archivos o un consumidor externo invalidaría una garantía global. Si no se verifica un directorio persistente único, NO iniciar pagos.

**HECHO:** conjunto de casos sintéticos ampliado a 24, con 12 por día (7 y 8 noviembre), hasta 24 llamadas por día: corrección de errores de dictado, naturalidad, brevedad, frustración, seguridad, continuidad, multiempresa y límites. No es reentrenamiento de un LLM ni clonación TTS.

**VERIFICADO EN PANEL AUTENTICADO DE DEEPSEEK (2026-11-06):** sesión iniciada, saldo recargado mostrado $98.23 USD, coste 30 días $1.76 USD, una fila de API key registrada. La clave existente solo se visualiza una vez al crearla; NO se ha leído ni recuperado el valor y NO está inyectada en el runner. En Usage se mostraba `Balance alert disabled`, que es una alerta, NO un techo duro de gasto. No hay evidencia de límite de 50 EUR establecido en la plataforma DeepSeek.

**PLANIFICADO / BLOQUEADO PARA FIN DE SEMANA:** no se ha realizado inferencia DeepSeek real ni despliegue de CEREBRO. GitHub Workflow de esta rama es únicamente CI offline y sin secreto, no un cron de inferencia. ChatGPT Automations no permitió crear tarea sexta sin sustituir otra. No inventar trabajo futuro ni declarar a JARVIS aprendiendo.

**Coste adicional observado de este corte:** 0 USD de inferencias nuevas; GitHub Actions offline consume cuota de ejecución ya disponible. No se modificaron CUT30, CUT33, D1, PR #25, main, App, CRM, PROD ni las cinco automatizaciones existentes.

**CI:** consultar la última ejecución del workflow `jarvis-deepseek-weekend-lab-ci.yml` antes de marcar las pruebas VERDE; los cambios recientes de presupuesto amplían las comprobaciones de regresión.

**Fuentes oficiales:** https://api-docs.deepseek.com/api/get-user-balance/ y https://api-docs.deepseek.com/quick_start/pricing/
