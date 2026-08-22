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
- Calculadora hipotecaria global: local, persistente por sesión/usuario, minimizable y sin `PRO` visible ni en el shell base ni en Inicio Dirección.
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

## Ana contextual · endurecimiento 22/08/2026

- Las correcciones preparadas desde una pantalla conservan `resource/scope_type`, `scope_code`, corrección, motivo y regla propuesta al abrir `/ana`.
- El formulario de gobierno de Ana precarga el contexto recibido en la URL y lo envía al backend de correcciones en lugar de degradarlo siempre a `general`.
- La corrección sigue sin convertirse en norma automáticamente; Dirección mantiene la decisión final.
- No se añade capacidad de alta de registros mientras el backend de creación no esté validado específicamente.

## Agenda · traslado de tareas · cierre 22/08/2026

- La ficha canónica de tarea permite a Dirección trasladar una tarea a otra persona activa del equipo utilizando `ID trabajador operativo` de la fuente Notion existente.
- Los destinos se obtienen de las fuentes autorizadas de personal financiero y visitadores; no se crean responsables por texto libre ni por inferencia.
- Financiero y Visitador no ven el control de traslado.
- El backend `fenix-notion-actions-test` v3 valida identidad, rol y destino activo antes de escribir y mantiene auditoría de la mutación.
- El cambio pasa por la misma vista previa obligatoria que el resto de escrituras: seleccionar → revisar → confirmar → guardar.
- No se utiliza el RPC histórico que reasigna la tabla `preprod_test.tareas`, porque Agenda opera sobre la fuente Notion canónica y mezclar ambos almacenes produciría divergencia.

## Notarías · cierre canónico 22/08/2026

No se creó ninguna base duplicada. Se reutilizan dos fuentes ya existentes y conceptualmente distintas:

- `Notarías · Fénix Capital`: directorio maestro. Data source canónico `053afd8f-0809-4d24-8006-1afd265e03a9`.
- `Notaría y firma · Fénix Capital`: flujo operativo de FEIN, acta y firma, enlazado con el directorio mediante `Notaría maestra`.

Se desplegó el runtime PRE-PROD `fenix-notarias-runtime-test` v1, de solo lectura, con autenticación y RBAC propios. Expone `/health`, `/notarias` y `/notarias/:id`; Dirección y Financiero pueden leer el directorio y Visitador recibe 403. El navegador no consulta Notion directamente.

La UI `/notarias` y `/notarias/:id` muestra exclusivamente campos existentes del directorio: nombre, activo, dirección, localidad, notario/oficial principal, teléfono, email, horario/observaciones, notas y última firma. Los KPI de la lista se limitan a conteo visible, activos explícitos y localidades únicas. No se completan datos ausentes.

La navegación PRE-PROD incorpora `/notarias` para Dirección y Financiero, pero no para Visitador. La forma real de navegación del gateway, que devuelve rutas como strings, queda normalizada centralmente en `fetchAppApi` y cubierta por QA.

## Evidencia verde vigente

CI #726 `32566382106` sobre head `ad0baa9ae5ce9ee68adf38fa75770b6c99d62b8d`: **GREEN**.

- Build TypeScript/Vite: SUCCESS.
- Browser QA: SUCCESS, incluido traslado de tareas Dirección y ausencia del control para Financiero.
- Artifact dist: `9474193125`, SHA256 `50de37cb3e3acc6328ce1b3a46d57a6582c6ca17e64a6d32d6d14ebd350a270d`.
- Playwright report: `9474193271`, SHA256 `034c87940ebe8bda0655e790a93823a9c798d5302c12e3269cde3061e857c05d`.
- Snapshot PRE-PROD GitHub Pages: SUCCESS dentro del run de PR.
- `deploy-preprod-pages` permanece omitido en el run de PR; el smoke HTTPS público todavía no se considera verificado.

## Deuda de asignaciones operativas

- Expedientes: 71 total; 11 con ID financiero operativo y 60 sin asignación segura.
- Clientes: 83 total; 5 con ID financiero operativo.
- Inmobiliarias: 251 total; 2 con ID visitador operativo.
- Backfill determinista agotado. No se asignan responsables por intuición.

## Criterios de promoción

Antes de cualquier promoción deben mantenerse en verde build + Browser QA, resolver cualquier regresión, completar un smoke HTTPS PRE-PROD verificable y obtener autorización explícita. `main`, PROD y WordPress continúan fuera de alcance.
