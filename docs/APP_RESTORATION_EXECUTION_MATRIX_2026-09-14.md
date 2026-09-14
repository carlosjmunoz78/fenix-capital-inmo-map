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
- HECHO EN RAMA — `ExpedienteAliasDisplayGuard` prioriza el alias humano visible sobre el identificador técnico largo en la cabecera del expediente.
- EXISTENTE — `ExpedientePeoplePanel` ya implementa fichas desplegables, edición, alta, datos financieros y documentación.
- ROJO LOCALIZADO — esa UI histórica solo se monta fuera de PROD y sus writes apuntan a `fenix-comprador-action-test`.
- HECHO / BACKEND PROD ENCONTRADO — Edge Function `fenix-expediente-people` v2, verify_jwt=true, con GET por expediente y POST create/update, usando wrappers `fenix_prod_exp_people_server`, `fenix_prod_exp_person_create_server` y `fenix_prod_exp_person_update_server`.
- HECHO / CONTRATO VERIFICADO — los wrappers PROD devuelven el mismo núcleo de datos esperado por `ExpedientePeoplePanel`, aplican RBAC Direccion/Financiero y relación exacta expediente-persona.
- HECHO EN RAMA — `ExpedientePeopleProdGuard` está montado en `DetailShellGate` y recupera las fichas desplegables en PROD en modo lectura antes de abrir escritura.
- SIGUIENTE — paridad de escritura create/update contra el contrato PROD existente; no crear un segundo modelo ni un segundo panel.
- PARCIAL — roles actuales no cubren todos los confirmados. Ampliar conservando legacy: Titular/Comprador, Avalista, Coprestatario, Vendedor, Propietario, Representante, Otro.

## G3 · Documentos / OCR / proyección

- EXISTENTE — `UniversalDocumentIntelligenceGuardV2` ya usa OCR (`browserDocumentOcr`), clasificación, extracción, sanitización crítica, preservación del original, dedupe y conflicto 409.
- EXISTENTE — en PROD usa `fenix-prod-documents`, `fenix-evidence-api` y `fenix-document-intelligence`.
- EXISTENTE — funciones PROD activas: `fenix-document-intelligence` v12, `fenix-document-extract` v12, `fenix-document-reread` v2, `fenix-document-auto-ingest` v2, `fenix-document-existing-backfill` v7.
- EXISTENTE — `ExpedienteDocumentsGuard` filtra documentos por relación canónica exacta al expediente.
- PARCIAL — validar PDF digital, PDF escaneado y PDF con imágenes incrustadas con casos controlados.
- PARCIAL — demostrar asociación persona-documento y descarga RBAC.
- POR AUDITAR — `AnaUniversalGuard` mantiene bucket fijo `fenix-preprod-documents-test`; no tocar hasta reconciliar con Evidence API/Storage PROD.

## G4 · Inicio / KPI / bancos / tareas

- EXISTENTE — `ExpedienteBankRankingGuard` muestra Top 3 por expediente con score, razones, riesgos y estrategia.
- ROJO — `DirectionKpiDrilldownGuard` devuelve 503 deliberadamente en PROD porque usa `fenix-direction-kpis-test`; el click existe pero el desglose exacto no funciona en PROD.
- DEFINIR — estado canónico `en curso`: negocio confirma no firmado y no cerrado; mapear fases legacy antes de cambiar filtro.
- PLANIFICADO — KPI Bancos de Inicio = Top 3 dinámico según operaciones reales/resultados, no ranking decorativo.
- PLANIFICADO — `requiere atención hoy` y navegación exacta.
- POR AUDITAR — tarea exacta ya tiene guard/detail en código; probar click de listados antes de modificar.

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
- HECHO — run `34838928134` sobre head `3c43462cf2aa3462276218243236f51c37e2e7e6`: `success`.
- NO PROMOVER AÚN — faltan contratos funcionales de escritura/UX y QA E2E; el build verde no implica paridad funcional completa.
- Gates restantes: tests contractuales, OLD-vs-NEW, historias E2E, QA visual, rollback probado.
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
