# CEREBRO OS · JARVIS · Autenticación duradera y puertas físicas (09-11-2026)

## Situación comprobada

Proyecto: Fénix Capital; motor `CONSOLE-001`, versión laboratorio. La App pública y `main`, `gh-pages`, CRM, DNS y Trading quedan fuera de alcance.

1. **Autenticación actual**: `jarvis-orchestrator-v0`, `jarvis-git-gateway-v1` y `jarvis-work-gateway-v1` exigen sesión Supabase JWT válida mediante `auth.getUser()` y comprueban `fenix_prod_actor_context_by_auth_server`. El workflow `jarvis-authenticated-orchestrator-e2e.yml` obtiene el JWT de `secrets.CEREBRO_E2E_USER_JWT`. Se ha demostrado que funciona cuando el token está vigente, pero no se renueva automáticamente y caduca. **No almacenes ni registres access/refresh tokens en código o documentación.**
2. **Registro de actor**: consulta de solo lectura a `fenix_prod.actors` identificó un `CARLOS-ADMIN` activo y ninguna identidad activa `DIR-TEST` en PROD. No se ha creado ni modificado ninguna identidad.
3. **Riesgo previo a provisionar DIR-TEST**: las rutas owner/actor actuales aceptan `DIR-TEST`, incluso para acciones sensibles. Una identidad de prueba nueva no se debe vincular antes de que TODAS las puertas directas (orquestador y gateways downstream) apliquen permisos limitados, incluidas restricciones de mutación. El control debe ser backend, no solo UI.
4. **Evidencia de ejecución**: E2E histórico `41605782462` validó autenticación, `REPO_HEAD`, `REPO_FILE` y aceptación de jobs; los jobs `SEARCH_CODE` y `GIT_STATUS` fueron después completados `SUCCEEDED` con evidencia separada. **E2E que observa `QUEUED` no demuestra trabajo ejecutado.**
5. **Corrección de nomenclatura**: en esta rama LAB se ha sustituido el anuncio `SEARCH_CODE=GREEN` por `SEARCH_CODE_ACCEPTED=GREEN`; igual para `GIT_STATUS`; el resumen final dice `ENQUEUE_E2E=GREEN; PHYSICAL_COMPLETION=NOT_ASSERTED`. Es una corrección de contrato de reporte, no una promoción ni un nuevo secreto.
6. **Ciclo automático**: el workflow `jarvis-git-safe-preprod-worker.yml` antiguo tiene un paso `rearm` que puede generar ciclos repetidos. Se mantiene desactivado y no se reinstala ni habilita por un test.
7. **Integración Git UI**: rama `cerebro/jarvis-git-parity-lab-20261109`; controles `STATUS, DIFF, CI_READ, COMPARE` consultan SHA y entorno antes de encolar; UI exige después job `SUCCEEDED` y `result_summary.status` en `GIT_SAFE_PROD_CONTROL_GREEN` o `GIT_SAFE_PREPROD_GREEN`, y flags `prod_touched=false`, `trading_touched=false`. GET acotadas y sin rearm. Comprobación en GitHub Actions: [42538632802](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42538632802), **GREEN 8/8**. Mock del gateway, no prueba física UI→PROD.

## Ruta mínima para autenticación E2E sin copiar un JWT cada vez

**Definido, no implementado:**

- Evaluar una identidad **dedicada, no personal**, sin acceso a datos de App/CRM y con permisos de operaciones de prueba explícitos. Antes de vincularla a la política owner, actualizar todas las puertas de permisos y probar que `SAVE_FILE`, `ROLLBACK_COMMIT`, `WORK_CANCEL`, rutas sensibles del Gateway y accesos directos quedan denegados. No crear DIR-TEST con privilegios heredados.
- Solo tras esos gates, provisionar una credencial de login de prueba usando un mecanismo cifrado del proveedor ya contratado; cada job de Actions obtiene un access token efímero justo al comenzar, utiliza TLS y no registra valores. No reutilizar contraseña personal ni almacenar refresh token en repositorios o chats.
- Alternativa sin identidad nueva: para pruebas exclusivamente de consumidor Git, aprovechar el OIDC GitHub ya existente, validando `issuer`, `audience`, `repository`, `workflow_ref` y `ref`. Ese control **no sustituye** el E2E de autorización de usuario de la App.
- Conservar los secretos existentes sin modificación hasta disponer de sustituto probado, rotación y revocación de sesiones comprometidas. Verificar caducidad antes de gastar minutos en E2E.
- No hay constancia de una renovación automática implantada. Estado: **PENDIENTE / HUMAN_REQUIRED si es imprescindible provisionar una identidad privilegiada**.

## Gate de voz y recuperación

- Botones `Dictar` y `Conversación por voz`: visibles en Opera autenticado; pruebas de navegador con SpeechRecognition simulado y denegación de permisos: GREEN. Esto **no prueba** grabación real, STT/TTS, latencia, ni la identidad vocal.
- Perfil `cerebro/communication/voice/jarvis/manifest.json`: `prod_authorized=false`, referencia de voz `PARTIAL`, `prod=BLOCKED`. Sin promover.
- Rollback compilado offline, backups `main` y `gh-pages` verificadas. Restauración real con tráfico y reversión física: **PENDIENTE**. No tocar DNS ni publicar snapshot.

## Gates de salida

`AUTH_LONG_LIVED_READONLY` → `GIT_UI_REAL_AUTH_E2E` → `PHYSICAL_MIC_VOICE` → `OLD_VS_NEW_SERVICE_PARITY` → `RESTORE_REVERSAL_TEST` → `TRIBUNAL` → `PROD`.

**Regla:** No hay evidencia ⇒ No está hecho. Coste adicional contratado 0 € y ninguna modificación de las superficies PROD protegidas.

## Observación de rama principal al cerrar

La rama `main` avanzó durante estas pruebas de `862ee543036070bc2cbb3ccaffc6c81af6d6a225` a `3600942775fbc19b47560e6f798caca107cd7473`, un commit posterior denominado `CEREBRO: register FULL_SAFE_PREPROD dynamic capabilities [skip ci]` que únicamente modifica `cerebro/registry/skill-dynamic-adoption-v1.json`. No lo realizó este laboratorio y **no afecta directamente a los archivos de JARVIS examinados**, pero toda promoción futura requerirá comparar el HEAD vigente y repetir los gates. `gh-pages` se verificó sin cambios en `01650c6fb728aa9d41dc4877dd4bee243372be68`. No se han alterado las ramas protegidas desde este laboratorio.
