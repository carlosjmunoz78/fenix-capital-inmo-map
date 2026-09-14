# APP Fénix · matriz de ejecución de restauración · 2026-09-14

Objetivo: recuperar y mejorar la funcionalidad perdida tras migración sin rehacer la App ni romper contratos existentes. Esta matriz es continuidad canónica para otros chats y material reutilizable por CEREBRO App Factory.

## Convención
- HECHO: probado con evidencia suficiente.
- EXISTENTE: capacidad encontrada; pendiente de promoción o prueba completa.
- PARCIAL: funciona solo en parte o falta contrato PROD.
- ROJO: regresión/ausencia localizada.
- POR AUDITAR: no modificar hasta entender dependencias.

## G1 · Chrome global / navegación / Ana / voz

- PARCIAL — navegación: `ProfileShell` ya conserva la última navegación autorizada del mismo usuario en sesión; resto de shells aún puede caer a `/inicio`.
- EXISTENTE — micrófono: `AudioTranscriptionGuard` ya estaba montado indirectamente por `IntelligentDocumentIngestionGuard`; la rama evita un segundo montaje y lo oculta en login/auth.
- HECHO EN RAMA — `AnaUniversalGuard` no aparece en Inicio.
- HECHO EN RAMA — retirada acción contextual redundante `Ana se ha equivocado`; la corrección queda en el micro.
- ROJO — todavía existen formularios de corrección duplicados en algunas pantallas (por ejemplo Informes); retirar solo después de comprobar que el micro global cubre el contexto necesario.
- HECHO EN RAMA — calculadora flotante icon-only y lanzador Chat icon-only encima, reutilizando el guard global existente sin cambiar el motor de cálculo.

## G2 · Expediente humano / participantes

- EXISTENTE — `ExpedienteRenameGuard` permite editar alias en PROD con `fenix_prod_exp_update`.
- HECHO EN RAMA — el título visible del expediente prioriza el alias humano; el identificador técnico se conserva internamente.
- EXISTENTE — `ExpedientePeoplePanel` histórico implementa fichas desplegables, edición, alta, datos financieros y documentación, pero estaba conectado a TEST.
- HECHO / BACKEND PROD — Edge Function `fenix-expediente-people` v2, verify_jwt=true, con GET por expediente y POST create/update, usando wrappers `fenix_prod_exp_people_server`, `fenix_prod_exp_person_create_server` y `fenix_prod_exp_person_update_server`.
- HECHO / CONTRATO VERIFICADO — RBAC Direccion/Financiero, relación exacta expediente-persona, no duplicación por DNI/NIE y actualización de rol dentro del expediente.
- HECHO EN RAMA — `ExpedientePeopleProdGuard` está montado en `DetailShellGate` y recupera fichas desplegables en PROD.
- HECHO EN RAMA — restauradas alta y edición contra el contrato PROD real; no se usa `fenix-comprador-action-test`.
- HECHO EN RAMA — roles disponibles: Titular comprador, Avalista, Coprestatario, Vendedor, Propietario, Representante y Otro.
- HECHO BUILD — commit `674d785fd17ab7a23f3ca32d1e6b7739028126b6`, check `build` success, run `34839288399`.
- PENDIENTE E2E — no ejecutar escrituras reales de participante hasta tener caso controlado y limpieza/rollback definidos.

## G3 · Documentos / OCR / proyección

- EXISTENTE — `UniversalDocumentIntelligenceGuardV2` ya usa OCR (`browserDocumentOcr`), clasificación, extracción, sanitización crítica, preservación del original, dedupe y conflicto 409.
- EXISTENTE — en PROD usa `fenix-prod-documents`, `fenix-evidence-api` y `fenix-document-intelligence`.
- EXISTENTE — funciones PROD activas: `fenix-document-intelligence` v12, `fenix-document-extract` v12, `fenix-document-reread` v2, `fenix-document-auto-ingest` v2, `fenix-document-existing-backfill` v7.
- HECHO BACKEND — `fenix-document-intelligence` ya tiene tratamiento específico `origin_type=comprador`: resuelve expediente, compara campos, abre conflictos y actualiza la ficha del participante mediante `fenix_prod_exp_person_update_server`.
- HECHO EN RAMA — la ruta `/documentacion?expediente=<exp>&comprador=<client_code>&upload=1` ya conserva `client_code` hasta `UniversalDocumentIntelligenceGuardV2`; el motor usa `origin_type=comprador` y no mezcla el documento con otro participante.
- HECHO EN RAMA — al llegar desde la ficha de una persona, el modal documental se abre en contexto de esa persona y el guard muestra explícitamente que los datos se consolidarán sobre su ficha.
- HECHO EN RAMA — normalización semántica para la proyección canónica: `neto/liquido → ingresos_netos_mensuales → sueldo_neto_mensual`, `antiguedad/antiguedad_actual_anos → antiguedad_laboral`, `empresa_actual/empresa_pagador → empresa → empresa_organismo`, además de identidad y ahorro cuando sean equivalentes.
- HECHO BUILD — commit de contexto documento→persona `6218242631ae438e1eec1266e3ffa87fc28d61fe`, run `34840475869`, `success`.
- EXISTENTE EXTRACTOR — el esquema maestro ya contempla Contrato de trabajo (`tipo_contrato`, modalidad, fecha inicio/fin, jornada, categoría, periodo de prueba, salario pactado), Vida laboral (empresa actual, fecha alta, antigüedad, periodos, días cotizados) y Nómina (empresa, periodo, antigüedad, categoría, salario base, complementos, bruto, neto, cotización, IRPF, deducciones, embargos/anticipos).
- GAP CANÓNICO LOCALIZADO — el perfil PROD de `fenix_prod.clientes.profile` hoy tiene claves para sueldo neto, antigüedad laboral, empresa, deudas, ahorro, situación laboral, etc., pero no existe todavía una clave canónica visible para `tipo_contrato`, `modalidad_contrato`, `fecha_inicio/fin`, `jornada`, `categoria_profesional` o `numero_pagas`. No mezclar esos conceptos dentro de `situacion_laboral`; ampliar contrato/perfil de forma explícita antes de proyectarlos.
- PENDIENTE E2E — validar PDF digital, PDF escaneado y PDF con imágenes incrustadas con casos controlados y confirmar que cada dato termina en la persona correcta.
- PENDIENTE MODELO — ampliar la ficha canónica para conservar y mostrar todos los hechos laborales/financieros extraídos sin perder semántica ni sobrescribir silenciosamente.
- PARCIAL — demostrar descarga RBAC del original desde la ficha de la persona.
- POR AUDITAR — `AnaUniversalGuard` mantiene bucket fijo `fenix-preprod-documents-test`; no tocar hasta reconciliar con Evidence API/Storage PROD.

## G4 · Inicio / KPI / bancos / tareas

- EXISTENTE — `ExpedienteBankRankingGuard` muestra Top 3 por expediente con score, razones, riesgos y estrategia.
- HECHO EN RAMA — `DirectionKpiDrilldownGuard` ya no depende en PROD de `fenix-direction-kpis-test`; reutiliza contratos canónicos de expedientes/firmas y mantiene navegación exacta.
- HECHO CANÓNICO — `useDirectionLiveData` define `en curso` excluyendo firmado/posventa/perdido/cerrado/anulado/cancelado/pasado/desistido; coincide con la regla de negocio de no firmado/no cerrado.
- HECHO — `DirectionPriorityActionGuard` intercepta cada prioridad de Inicio y navega a `priority.route`; una tarea con id abre `/tareas/<id>` en lugar de Agenda genérica.
- PLANIFICADO — KPI Bancos de Inicio = Top 3 dinámico según operaciones reales/resultados, no ranking decorativo.
- PLANIFICADO — `requiere atención hoy` y navegación exacta para cada registro.

## G5 · Perfil / usuarios / redes / objetivos

- ROJO UI — `ProfileShell` actual es esencialmente de lectura y expone pocas redes.
- EXISTENTE BACKEND — `fenix-profile-api` v1 GET/PATCH, verify_jwt=true; actualmente PATCH solo `display_name` y `zone_code`.
- EXISTENTE BACKEND — wrappers server-only ya disponibles para leer/actualizar redes sociales (`profile_socials_get_server`, `profile_socials_update_server`) y para actualización ampliada de perfil.
- EXISTENTE BACKEND ADMIN — `fenix-user-admin` v2 permite listado, alta de usuario y `reset_password` seguro para actores administrativos autorizados. No expone contraseña existente.
- PARCIAL — contrato actual no cubre todavía todas las redes, objetivos y edición completa solicitada.
- REGLA CONFIRMADA — Belén gestiona lo suyo; Carlos gestiona lo suyo y administrativamente lo de Belén, incluida establecer nueva contraseña/roles autorizados. Nunca mostrar contraseña existente.
- SIGUIENTE — ampliar contrato de perfil preservando wrappers server-only y hacer UI sobre contrato, no persistencia paralela.

## G6 · Informes / acciones masivas

- HECHO BACKEND — `fenix-reports-api` v8 está activo y usa `fenix_prod_reports_server`.
- HECHO CONTRATO — `fenix_prod_reports_server` materializa 30 días diarios y 12 semanas; Dirección recibe ámbito empresa, otros roles su propio ámbito; eventos tienen zona Europe/Madrid y hora exacta/segundo, no duración inventada.
- EXISTENTE UI — `InformesShell` consume el runtime de Informes.
- PARCIAL UX — la UI trata registros como PDFs/URLs aunque el contrato PROD también entrega actividad estructurada; debe renderizar actividad diaria/semanal aunque no exista PDF.
- ROJO UX — Informes conserva un bloque duplicado “¿En qué me equivoco?” que debe desaparecer cuando el micro contextual esté validado.
- PLANIFICADO — selección múltiple y acciones masivas por módulo con comentario común escrito/dictado, preview, confirmación, RBAC, idempotencia y auditoría.

## G7 · QA / promoción

- PR de restauración: #380, rama `app-restoration-v0-20260914`.
- HECHO — PR sigue mergeable y aislado de `main`.
- HECHO — workflow aislado `App Restoration Build Gate`, solo build, sin deploy y sin reactivar App PRE-PROD.
- HECHO — builds verdes confirmados hasta el contrato documento→persona; no equivalen todavía a E2E funcional completo.
- NO PROMOVER AÚN — faltan E2E documento→persona con PDFs reales/controlados, extensión canónica de hechos laborales, Perfil completo, Informes/masivas, QA visual y OLD-vs-NEW.
- No usar Codex/Work salvo que sea necesario para browser/computer-use amplio o refactor que no pueda verificarse con las herramientas actuales; conservar créditos.

## Aprendizaje para CEREBRO App Factory

Todo problema localizado debe convertirse en regla reusable:
1. La navegación autorizada debe degradar a la última autorización conocida del mismo usuario, nunca a un menú inventado ni a una ampliación de permisos.
2. Antes de crear un componente nuevo, buscar guard/shell/backend existente y envolverlo.
3. Nunca dejar una capacidad importante únicamente detrás de `*-test` o `!IS_PRODUCTION` sin registrar explícitamente su contrato de promoción.
4. UI y backend deben compartir estados canónicos y filtros KPI.
5. Relaciones persona-expediente-documento deben ser de primera clase y trazables.
6. OCR debe conservar original, evidencia, confianza, conflictos y destino de los campos.
7. Un control global probado elimina duplicados contextuales; no duplicar acciones por pantalla.
8. Los informes deben renderizar datos estructurados aunque no haya archivo PDF.
9. Todo cambio de restauración necesita evidencia, rollback y una historia E2E representativa.
10. Un build verde debe ser automático y aislado de despliegues; restauración y promoción son gates distintos.
11. Si el backend PROD ya expone create/update con RBAC, la UI debe reconectarse a ese contrato en lugar de conservar acciones `*-test` ocultas tras `!IS_PRODUCTION`.
12. La navegación hacia documentación de una persona debe conservar el `client_code` hasta el motor de extracción para que los campos terminen en la ficha correcta.
13. La extracción documental y el modelo canónico son contratos distintos: nunca perder un hecho extraído solo porque aún no exista su campo visible; conservarlo con evidencia y promoverlo al perfil mediante una extensión explícita y versionada.
14. No reutilizar un campo semánticamente distinto para “hacer caber” datos nuevos (por ejemplo, `tipo_contrato` no debe guardarse como `situacion_laboral`).
