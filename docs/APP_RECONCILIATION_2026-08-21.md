# APP FÉNIX CAPITAL · RECONCILIACIÓN MAESTRA · 21/08/2026

## Regla de continuidad

Este documento registra la reconciliación técnica de la APP Fénix en PRE-PROD. No autoriza promoción a `main`, PROD ni WordPress. No se inventan datos, asignaciones, KPI, personas ni valores económicos.

## Arquitectura vigente

- Rama de trabajo: `preprod-app-phase1`.
- PR #1 se mantiene abierto y en draft.
- Login: Supabase Auth PRE-PROD.
- Navegación y perfiles operativos: gateway autorizado.
- La respuesta viva de `/navigation` puede entregar rutas como strings; el cliente las normaliza centralmente a `{route,label}` sin modificar autorización ni fabricar rutas.
- Datos operativos: runtimes Notion TEST/PRE-PROD con RBAC de backend y aislamiento por registro.
- Escrituras operativas: actions TEST con vista previa obligatoria antes de confirmar.
- Calculadora hipotecaria global: local, persistente por sesión/usuario, minimizable y sin `PRO` visible.
- Ana: contextual, con preview antes de acciones sensibles y sin escritura implícita.

## Pantallas específicas reconciliadas

- Inicio Dirección con KPI derivados exclusivamente de fuentes canónicas.
- Inicio Financiero y Visitador por rol y ámbito autorizado.
- Expedientes: listado + ficha maestra.
- Contactos: listado + ficha.
- Inmobiliarias: listado + ficha B2B.
- Bancos: listado + ficha + contactos bancarios canónicos.
- Tasaciones.
- Agenda.
- Firmas.
- Documentación.
- Financieros: listado + ficha.
- Visitadores: listado + ficha.
- Economía: solo lectura para Dirección; cifras no soportadas permanecen `No disponible`.
- Informes.
- Buscador avanzado.
- Centro de avisos: derivado únicamente de tareas canónicas pendientes con fecha o criticidad explícita; no se simula una fuente de notificaciones inexistente.
- Notarías: directorio maestro canónico + ficha individual, separado del flujo operativo FEIN/acta/firma.
- Visitas B2B: preview antes de crear/completar.
- Mi perfil.

## Mi perfil · cierre 22/08/2026

- El perfil no depende de una entrada de menú: la identidad/avatar de la cabecera abre `/perfil` mediante ratón, Enter o Espacio.
- El comportamiento se aplica tanto al shell base como a los shells operativos que exponen `.ops-profile`.
- La navegación PRE-PROD elimina `/perfil` de los menús de Dirección, Financiero y Visitador.
- La ficha usa nombre, email y rol únicamente desde sesión/contexto autorizado.
- Si Supabase Auth entrega una fotografía HTTPS en `avatar_url`, `picture`, `photo_url` o `foto`, se muestra esa imagen real en formato grande.
- Si la sesión no aporta imagen, se mantienen iniciales como fallback; no se genera ni inventa una fotografía.

## Notarías · cierre canónico 22/08/2026

No se creó ninguna base duplicada. Se reutilizan dos fuentes ya existentes y conceptualmente distintas:

- `Notarías · Fénix Capital`: directorio maestro. Data source canónico `053afd8f-0809-4d24-8006-1afd265e03a9`.
- `Notaría y firma · Fénix Capital`: flujo operativo de FEIN, acta y firma, enlazado con el directorio mediante `Notaría maestra`.

Se desplegó el runtime PRE-PROD `fenix-notarias-runtime-test` v1, de solo lectura, con autenticación y RBAC propios. Expone `/health`, `/notarias` y `/notarias/:id`; Dirección y Financiero pueden leer el directorio y Visitador recibe 403. El navegador no consulta Notion directamente.

La UI `/notarias` y `/notarias/:id` muestra exclusivamente campos existentes del directorio: nombre, activo, dirección, localidad, notario/oficial principal, teléfono, email, horario/observaciones, notas y última firma. Los KPI de la lista se limitan a conteo visible, activos explícitos y localidades únicas. No se completan datos ausentes.

La navegación PRE-PROD incorpora `/notarias` para Dirección y Financiero, pero no para Visitador. La forma real de navegación del gateway, que devuelve rutas como strings, queda normalizada centralmente en `fetchAppApi` y cubierta por QA.

## Evidencia verde vigente

CI #688 `32545090609` sobre head `4d8363f3d16d199c40db62e197c4b674c4e42801`: **GREEN**.

- Browser QA: **207 tests / 79 passed / 128 skips intencionales / 0 fallos**.
- Build TypeScript/Vite: SUCCESS.
- Artifact dist: `9468250688`, 255611 bytes, SHA256 `b6f931408d1e8b3afbb043f1edac71c7f7d04384d2ea5dab10fdcf136625471a`.
- Playwright report: `9468251025`, 3621978 bytes, SHA256 `91d06065ba1b40694fd6e9708fcf644c0f376a60902b711f5b1e3a09218b1901`.
- Snapshot gh-pages: `bf0525a`, generado desde merge SHA CI `93d46027151d0a9bf70775226eef20ea113cf5fb`.
- `deploy-preprod-pages` permanece omitido; el smoke HTTPS público todavía no se considera verificado.

## Deuda de asignaciones operativas

- Expedientes: 71 total; 11 con ID financiero operativo y 60 sin asignación segura.
- Clientes: 83 total; 5 con ID financiero operativo.
- Inmobiliarias: 251 total; 2 con ID visitador operativo.
- Backfill determinista agotado. No se asignan responsables por intuición.

## Criterios de promoción

Antes de cualquier promoción deben mantenerse en verde build + Browser QA, resolver cualquier regresión, completar un smoke HTTPS PRE-PROD verificable y obtener autorización explícita. `main`, PROD y WordPress continúan fuera de alcance.