# APP FÉNIX CAPITAL · RECONCILIACIÓN MAESTRA · 21/08/2026

## Regla de continuidad

Este documento registra la reconciliación técnica de la APP Fénix en PRE-PROD. No autoriza promoción a `main`, PROD ni WordPress. No se inventan datos, asignaciones, KPI, personas ni valores económicos.

## Arquitectura vigente

- Rama de trabajo: `preprod-app-phase1`.
- PR #1 se mantiene abierto y en draft.
- Login: Supabase Auth PRE-PROD.
- Navegación y perfiles operativos: gateway autorizado.
- Datos operativos: runtime Notion TEST/PRE-PROD con RBAC de backend y aislamiento por registro.
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
- Visitas B2B: preview antes de crear/completar.
- Mi perfil.

## Mi perfil · cierre 22/08/2026

- El perfil ya no depende de una entrada de menú: la identidad/avatar de la cabecera abre `/perfil` mediante ratón, Enter o Espacio.
- El comportamiento se aplica tanto al shell base como a los shells operativos que exponen `.ops-profile`.
- La ficha usa nombre, email y rol únicamente desde sesión/contexto autorizado.
- Si Supabase Auth entrega una fotografía HTTPS en `avatar_url`, `picture`, `photo_url` o `foto`, se muestra esa imagen real en formato grande.
- Si la sesión no aporta imagen, se mantienen iniciales como fallback; no se genera ni inventa una fotografía.
- Evidencia CI: run #662 `32544557221`, **198 tests / 76 passed / 122 skips intencionales / 0 fallos**.
- Artifact dist: `9468095830`, 253591 bytes, SHA256 `f762718992d41142a635588d9be24713de40ac7bdeb7730e2b5856a2125504a0`.
- Playwright report: `9468096202`, 3615066 bytes, SHA256 `40bd5e32c848a725a70a9403c3aae42f8cb27baf8ed104fe857befdb6cd5e5e4`.
- Snapshot gh-pages: `664b98e`, generado desde merge SHA CI `030a87a64e5959ec111531cfab1a0769773a04e5`.
- El smoke HTTPS público sigue sin considerarse verificado porque `deploy-preprod-pages` permanece omitido.

## Auditoría Notarías · sin duplicar datos

Se confirmó que ya existe una base maestra `Notarías · Fénix Capital` y una base operativa distinta `Notaría y firma · Fénix Capital`. No se crea ninguna base nueva.

La base maestra de notarías contiene, entre otros, los campos: Notaría, Activo, Dirección, Localidad, Notario / oficial principal, Teléfono, Email, Horario / observaciones, Notas y Última firma. La base operativa de firma enlaza con esa maestra mediante `Notaría maestra` y mantiene el flujo FEIN/acta/firma. Antes de crear una pantalla `/notarias`, debe existir y verificarse una ruta de lectura autorizada desde la app; el runtime actual documentado no expone `/notarias`, por lo que no se debe inventar un endpoint ni leer Notion directamente desde el navegador.

## Deuda de asignaciones operativas

- Expedientes: 71 total; 11 con ID financiero operativo y 60 sin asignación segura.
- Clientes: 83 total; 5 con ID financiero operativo.
- Inmobiliarias: 251 total; 2 con ID visitador operativo.
- Backfill determinista agotado. No se asignan responsables por intuición.

## Criterios de promoción

Antes de cualquier promoción deben mantenerse en verde build + Browser QA, resolver cualquier regresión, completar un smoke HTTPS PRE-PROD verificable y obtener autorización explícita. `main`, PROD y WordPress continúan fuera de alcance.