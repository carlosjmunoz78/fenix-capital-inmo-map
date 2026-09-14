# APP Fénix · auditoría de restauración post-migración · 2026-09-14

Estado: AUDITADO / restauración en rama paralela. No usar la UI actual defectuosa como baseline.

## Reglas confirmadas

- Conservar → entender → envolver → probar → mejorar → migrar.
- No recrear datos plausibles para tapar ausencias.
- Fichas de participantes: DESPLEGABLES, no descargables.
- Documentos: visualizables y descargables según RBAC.
- Alias humano del expediente editable por usuario; `expediente_code` permanece técnico.
- Roles de participante mínimos: Titular/Comprador, Avalista, Coprestatario, Vendedor, Propietario, Representante, Otro.
- KPI: al pulsar debe abrir exactamente el conjunto que la genera.
- Tarea: al pulsar debe abrir la tarea exacta y su contexto.
- Ana: uso ordinario sin IA de pago; no fallback silencioso facturado.
- Micrófono global: Hablar con Ana / Dar conocimiento / Corregir / Tarea; dictado visible, parada manual y texto editable antes de ejecutar.
- Quitar accesos redundantes de corrección/conocimiento cuando el micrófono global esté probado.

## Hallazgos confirmados

### R-001 · Navegación degradable a solo Inicio
`src/App.tsx`, `src/DirectionDashboard.tsx` y varias superficies mantienen un fallback mínimo de `/inicio`. Si `/navigation` falla o devuelve vacío, una pantalla puede quedar reducida a Inicio.

**Estado:** PARCIAL. En `ProfileShell` la rama de restauración ya conserva la última navegación autorizada del mismo usuario en `sessionStorage`; no se inventan permisos. Falta unificar el patrón en el resto de shells.

### R-002 · Micrófono: existe y ya estaba montado indirectamente
`src/AudioTranscriptionGuard.tsx` implementa SpeechRecognition en español, transcripción intermedia, botón Parar, edición del texto y cuatro modos: Corregir, Dar conocimiento, Tarea y Hablar con Ana.

La auditoría inicial afirmó erróneamente que no estaba montado. Revisión posterior confirmó que `src/IntelligentDocumentIngestionGuard.tsx`, ya montado globalmente desde `main.tsx`, incluye `AudioTranscriptionGuard`.

**Estado:** CORREGIDO EN AUDITORÍA. Se retiró de la rama el segundo montaje directo que habría duplicado el micrófono. Se mantiene la mejora de ocultarlo en login/auth. Commit de corrección: `0cb4014e1f721abe14d46603a0a3eb8258e85472`.

### R-003 · Ana contextual aparece en Inicio
`src/AnaUniversalGuard.tsx` no excluía `/inicio`.

**Estado:** CORREGIDO EN RAMA. `/inicio` queda excluido junto con `/`, `/perfil` y `/ana`.

### R-004 · Corrección duplicada fuera del micrófono
`AnaUniversalGuard` mostraba `Ana se ha equivocado`, aunque esa acción ya existe en el micrófono global.

**Estado:** CORREGIDO EN RAMA. Se retiró el acceso contextual redundante; `Correcciones` permanece como bandeja de revisión hasta auditar contrato.

### R-005 · Ana contextual no muestra 3 prioridades reales
El encabezado usa `nextText()` con frases genéricas por tipo de ruta. No son tres prioridades calculadas con datos reales de la pestaña.

**Estado:** PARCIAL. No hardcodear tres textos. Requiere contratos de prioridad por módulo y datos reales antes de sustituirlo.

### R-006 · Audio de evidencia sin transcripción automática
`AnaUniversalGuard` declara explícitamente que el audio se conserva como evidencia sin transcripción automática.

**Estado:** PARCIAL. El micrófono de dictado sí transcribe en navegador; el audio subido como evidencia no. Hay que separar ambos contratos y añadir transcripción local/coste 0 donde corresponda sin romper evidencia original.

### R-007 · Storage documental: un flujo correcto PROD y otro flujo legado por auditar
`UniversalDocumentIntelligenceGuardV2` selecciona correctamente `fenix-prod-documents` en PROD y `fenix-preprod-documents-test` fuera de PROD. Sin embargo `AnaUniversalGuard` mantiene el bucket fijo `fenix-preprod-documents-test` para su subflujo de evidencia.

**Estado:** POR AUDITAR. No renombrar ni mover buckets a ciegas. Debe reconciliarse el subflujo de evidencia de Ana con el contrato documental PROD ya existente.

### R-008 · Inteligencia documental ya existe y no debe rehacerse
`UniversalDocumentIntelligenceGuardV2` ya soporta foto/PDF, OCR mediante `browserDocumentOcr`, clasificación, extracción, sanitización de campos críticos, tipo/persona declarados, preservación del original, deduplicación y conflicto 409 antes de sobrescribir. En PROD usa `fenix-document-intelligence` y `fenix-prod-documents`.

**Estado:** EXISTENTE / PARCIAL. Se debe probar con PDF digital y PDF compuesto por imágenes y completar la proyección persona ↔ documento; no crear un segundo motor OCR paralelo.

### R-009 · Documentos de expediente ya tienen relación canónica
`ExpedienteDocumentsGuard` lista únicamente documentos cuya relación canónica corresponde al expediente exacto y abre un documento concreto preservando retorno.

**Estado:** EXISTENTE / PARCIAL. Falta demostrar descarga RBAC y que cada documento quede además asociado al participante correcto cuando corresponda.

### R-010 · Alias editable existe, pero la cabecera prioriza un campo incorrecto
`ExpedienteRenameGuard` ya permite editar el alias en PROD mediante `fenix_prod_exp_update`. Sin embargo `DetailShell` calcula el título priorizando `expediente`/`expediente_code` antes que el alias/cliente visible. Esto explica que pueda verse un identificador largo aunque exista alias.

**Estado:** ROJO LOCALIZADO. Corregir el orden de presentación sin alterar `expediente_code` ni el contrato de escritura.

### R-011 · Fichas desplegables de participantes existen pero están deshabilitadas en PROD
`ExpedientePeoplePanel` ya tiene fichas desplegables, edición, alta de persona, datos financieros, documentación y roles. Pero `DetailShell` solo lo monta cuando `!IS_PRODUCTION && isNotionId(code)`, y las escrituras usan `fenix-comprador-action-test`.

**Estado:** ROJO / CAUSA DE MIGRACIÓN IDENTIFICADA. No basta con quitar el `!IS_PRODUCTION`: antes hay que envolver las operaciones de persona en Gateway/server wrappers PROD, probar paridad y luego habilitar la UI.

### R-012 · Roles de participante incompletos
El selector actual contiene `Titular comprador`, `Avalista`, `Titular + avalista`, `Otro interviniente`. El baseline confirmado exige también Coprestatario, Vendedor, Propietario, Representante y Otro.

**Estado:** PARCIAL. Ampliar contrato y UI preservando valores legacy.

### R-013 · Ranking bancario Top 3 ya existe por expediente
`ExpedienteBankRankingGuard` muestra Top 3 con score, razones, riesgos y estrategia y abre la ficha exacta del banco.

**Estado:** EXISTENTE / POR PROBAR EN PROD. La KPI de Inicio todavía no es el Top 3 global/operativo solicitado y debe alimentarse de resultados reales de operaciones, no de decoración.

### R-014 · Drilldown KPI no funciona en PROD por diseño actual
`DirectionKpiDrilldownGuard` contiene el contrato correcto de navegación para varias KPIs, pero `fetchKpi()` devuelve 503 explícitamente en PROD porque solo existe el backend `fenix-direction-kpis-test`.

**Estado:** ROJO / CAUSA IDENTIFICADA. Necesita endpoint PROD server-only/Gateway equivalente antes de declarar que una KPI abre exactamente su conjunto.

### R-015 · Definición de “expedientes en curso” debe reconciliarse
El drilldown actual define en curso como fase distinta de `Firmado`, `Posventa` y `Perdido`. El requisito confirmado por negocio es: expedientes realmente en curso = no firmados y no cerrados. Debe existir una definición canónica única y aplicarse tanto a KPI como a listado.

**Estado:** POR CERRAR CONTRATO. No cambiar solo la etiqueta: primero mapear estados/fases reales y casos legacy.

## Grupos de restauración

### G1 · Chrome global / navegación / Ana / voz
- Unificar fallback de navegación autorizada por usuario.
- Mantener un único micrófono global, no duplicarlo.
- Excluir Inicio y ventana de Ana del bloque contextual redundante.
- Quitar accesos duplicados cuando el micro esté probado.
- Auditar lanzadores Calculadora/Chat icon-only.

### G2 · Expediente humano y participantes
- Mostrar alias humano como título principal y `expediente_code` solo como dato técnico secundario.
- Mantener alias editable por usuario autorizado.
- Recuperar `ExpedientePeoplePanel` en PROD mediante Gateway, no mediante endpoint `*-test`.
- Ampliar roles sin borrar valores legacy.
- Mantener fichas desplegables y separación estricta de datos por persona.

### G3 · Documentos / OCR / proyección
- Conservar `UniversalDocumentIntelligenceGuardV2` como motor existente.
- Probar PDF digital, PDF escaneado y PDF con imágenes incrustadas.
- Validar clasificación, OCR, deduplicación, conflictos y relación persona/documento.
- Reconciliar el bucket legado de evidencia de Ana con el contrato documental PROD.

### G4 · Inicio / KPI / bancos / tareas
- Crear contrato PROD del drilldown KPI exacto.
- Fijar definición canónica de estados.
- Añadir KPI visual de bancos Top 3 dinámica basada en operaciones reales.
- Garantizar `click KPI -> conjunto exacto` y `click tarea -> tarea exacta + contexto`.
- Añadir `requiere atención hoy` con enlaces exactos.

### G5 · Perfil / objetivos / redes / seguridad
- Perfil totalmente editable según permisos confirmados.
- Belén puede cambiar lo suyo; Carlos puede administrar lo suyo y lo de Belén, incluida nueva contraseña y roles autorizados.
- Nunca mostrar contraseña existente en claro.
- Redes completas, estado de conexión y publicación solo con conector autorizado.
- Objetivos de resultado, actividad y calidad con progreso real.

### G6 · Informes / acciones masivas
- Informe diario global y por trabajador; semanal por rol/persona.
- Mostrar hora de evento, no duración inventada.
- Selección múltiple y acciones masivas con comentario común escrito/dictado, vista previa, confirmación, RBAC y auditoría.

### G7 · QA y promoción
- Build/TypeScript verde.
- Tests contractuales y OLD-vs-NEW.
- Historias E2E completas.
- QA visual.
- Rollback probado.
- Solo entonces merge/promoción gradual.

## Gates

- Sin writes reales de datos de cliente durante auditoría/restauración salvo prueba controlada explícita con limpieza.
- Sin revocar capacidades durante la restauración.
- Sin crear un segundo OCR, ranking o modelo de datos cuando ya existe una capacidad preservable.
- Build/TypeScript verde antes de merge.
- QA visual y funcional antes de promoción.
- Rollback = volver al SHA previo de la rama/PR.
