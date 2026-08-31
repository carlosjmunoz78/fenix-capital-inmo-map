# Fénix Capital · Cierre operativo PROD · 2026-08-31

## Resultado

Los 20 pasos del plan de cierre PROD han sido ejecutados, corregidos y verificados. La aplicación queda operativa con los datos reales actualmente disponibles, sin rellenar módulos vacíos con registros TEST o ficticios.

Baseline técnico previo a este documento: `f1efb921d32ad11cb130a14806265ed3a09a80c4`.

PROD Runtime Smoke #13: run `33396641074` · SUCCESS. Este gate ya incluye compilación TypeScript/Vite antes de las comprobaciones runtime.

Browser QA previo al merge de #13: run `33396251318` · SUCCESS tras corregir la selección explícita de responsable en Nueva tarea. La suite valida escritorio, tablet y móvil, navegación autorizada, dark mode, shell fijo, rutas profundas, RBAC, confirmaciones sensibles y módulos operativos.

## Inventario canónico final

- Expedientes reales: 44.
- Inmobiliarias reales: 401.
- Clientes: 71.
- Contactos de inmobiliaria: 48.
- Tareas: 85.
- Notarías: 68, de ellas 67 activas.
- Registros de la Propiedad: 40, todos activos.
- Bancos reales: 0.
- Contactos bancarios reales: 0.
- Tasaciones reales: 0.
- Firmas reales: 0.
- Movimientos económicos reales: 0.
- Actores activos: 1 (`BELEN-DIR`, Dirección).

Los módulos a cero están en estado vacío deliberado porque no existe una fuente real validada que migrar. Se excluyeron expresamente registros TEST/ficticios localizados en las fuentes heredadas.

## Documentación

La documentación histórica quedó migrada al almacenamiento privado PROD:

- 31 expedientes legacy con adjuntos reconciliados.
- 118/118 adjuntos de origen trazados.
- 117 documentos/binarios únicos por una deduplicación exacta.
- 117 versiones registradas.
- 0 documentos sin versión.
- 122.868.624 bytes almacenados.
- Lectura autorizada y obtención de ruta privada verificadas.
- El visor PROD fue corregido para normalizar el detalle y obtener URL firmada privada sin publicar el bucket.

## Seguridad y aislamiento

- Identidades no vinculadas fallan cerradas en los contratos auditados.
- `Personal`, `Visitadores`, `Ana capabilities`, `Ana corrections` y `Economía` devuelven 403 para actor inexistente.
- Ana puede ayudar, recibir correcciones y elevar aprendizaje, pero `can_ana_execute=false` en PROD: no ejecuta cambios autónomamente.
- Las decisiones de aprendizaje permanecen gobernadas por autoridad humana.
- PRE-PROD conserva endpoints `-test`; PROD usa contratos propios.
- Informes dejó de consumir `fenix-reports-api-test` en PROD.
- Alta de tareas dejó de consumir el endpoint TEST en PROD.
- Alta de bancos dispone de API PROD autenticada.
- Las funciones temporales de migración/sincronización (`*-sync-once`, `*-trigger-once`, legacy docs) están retiradas con `410 Gone` y JWT obligatorio.
- `fenix-app-gateway` mantiene validación de bearer e identidad en su propio código y el smoke confirma 401 sin identidad.

## UI y QA

El cierre visual/operativo incluye:

- Navegación autorizada por backend y fallback fail-closed.
- Rutas profundas sin ampliación de permisos.
- Menú y topbar consistentes entre módulos.
- Shell con workspace desplazable sin scroll doble.
- Modo oscuro sin superficies blancas residuales cubiertas por regresión.
- Navegación responsive probada a 360, 390, 768, 820, 1024 y escritorio.
- Shell móvil, tema y calculadora probados en Chromium.
- Nueva tarea exige responsable explícito a Dirección antes del preview; otros roles mantienen su autoasignación operativa.

## Estado de los 20 pasos

1. Fix PROD pendiente — cerrado.
2. CI/checks — cerrado.
3. Serving/deploy PROD — cerrado.
4. Auth/RBAC — cerrado.
5. Inicio — cerrado.
6. Contactos — cerrado.
7. Expedientes — cerrado.
8. Inmobiliarias — cerrado.
9. Tareas/Agenda — cerrado.
10. Notarías — cerrado.
11. Registros de la Propiedad — cerrado.
12. Bancos — cerrado hasta el límite de datos reales disponibles.
13. Tasaciones — cerrado; vacío real correcto.
14. Firmas — cerrado; vacío real correcto.
15. Documentación — cerrado, incluida migración binaria y visor privado.
16. Financieros/Visitadores — cerrado; vacío real correcto y RBAC endurecido.
17. Economía/Informes — cerrado; cero real correcto e Informes aislado de TEST.
18. Ana/acciones — cerrado; gobernanza, idempotencia y endpoints temporales revisados.
19. Navegación/UI responsive/dark — cerrado con Browser QA completo.
20. Smoke integral/cierre — cerrado sujeto al smoke automático del merge de este documento, que no modifica runtime.

## Criterio de operación desde este punto

No insertar datos ficticios para “rellenar” módulos. Bancos, contactos bancarios, tasaciones, firmas, movimientos económicos, informes, financieros y visitadores deben poblarse exclusivamente cuando existan registros reales y autorizados. Las ausencias actuales son ausencia de dato, no fallo de aplicación.

Cualquier cambio posterior en `main` deberá superar el gate de compilación + PROD Runtime Smoke. Los cambios funcionales deberían seguir pasando previamente por PR y Browser QA completo.
