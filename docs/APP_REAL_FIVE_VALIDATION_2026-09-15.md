# App real · diagnóstico y promoción mínima de los cinco flujos

## Estado observado

- App real: `https://app.fenixcapital.es` sirve `PROD_SOURCE_SHA=e10ba788b60215e5b7130e4419e1c0ec8ed1508e`.
- PR #385: cabeza `1ba110ae81645b6c4665f1be7e19c3f1c784d7fe`, base `e10ba788b60215e5b7130e4419e1c0ec8ed1508e`, abierto y DRAFT.
- `gh-pages`: snapshot de despliegue de `e10ba788b60215e5b7130e4419e1c0ec8ed1508e`.
- Conclusión: la App real no contiene los commits del PR que implementan los cinco cambios. El verde de CI valida la cabeza del PR, no el artefacto servido en PROD.

## Evidencia OLD vs NEW

| Estado | SHA | Resultado |
| --- | --- | --- |
| OLD servido en PROD | `e10ba788b60215e5b7130e4419e1c0ec8ed1508e` | El bundle `assets/index-BvDlBhBv.js` no contiene los marcadores de los guards de participantes/chat del PR. |
| PR #385 | `1ba110ae81645b6c4665f1be7e19c3f1c784d7fe` | Contiene la restauración, pero sus pruebas no detectaban que el mensaje masivo se borraba al recargar, que `hidden` era anulado por CSS ni que los flotantes se solapaban en móvil. |
| NEW código validado | `1cb34f8fb89ec51e4d757f3268eca9831fe98313` | Corrige esos defectos y supera los cinco flujos sobre build PROD local, contratos, visuales y anchos responsive; los commits documentales posteriores no alteran el runtime. |

La rama segura es `app-real-five-validation-20260915`, derivada de la cabeza del PR; no se ha desplegado ni fusionado.

## Cobertura reproducible añadida

`tests/app-real-five-flows.spec.ts` compila el frontend con `VITE_FENIX_ENV=prod` y un backend local interceptado. Así ejecuta las ramas, guards, nombres de funciones y almacenamiento de sesión que usa PROD sin leer ni escribir datos reales.

El contrato prueba:

1. Expedientes: selección progresiva de 4, 5 y todos, URL estable y `POST /fenix-expediente-actions` con versiones esperadas.
2. Tareas: selección progresiva de 4, 5 y todas, URL estable y `POST /fenix-task-actions` con versiones esperadas.
3. Expediente: fichas colapsadas por participante, despliegue de datos y segundo despliegue de documentos vinculados.
4. Hablar con Ana: panel oscuro, consulta canónica y turno usuario/Ana en el mismo panel.
5. Flotantes: orden visual micro → calculadora → chat, separación corta y homogénea, alineación y estilo idéntico en escritorio, tableta y móvil.

## Duplicidades del menú inferior

El micro global ya ofrece `Hablar con Ana`, `Dar conocimiento`, `Corregir a Ana` y `Tarea`. Por tanto, los accesos rápidos inferiores que solo reenvían a esos cuatro modos son candidatos a retirada futura.

No se eliminan ahora:

- La pantalla `/ana` sigue siendo necesaria para la conversación persistente, historial, conocimiento y gobierno/revisión de Belén.
- La ruta `/tareas/nueva` sigue siendo necesaria como formulario completo y destino del borrador creado desde el micro.
- Cualquier botón inferior que sea el único acceso visible para un rol concreto debe conservarse hasta verificar navegación y permisos por rol en la App real autenticada.

## Promoción mínima, todavía no autorizada

1. Mantener PR #385 en DRAFT y `SAFE_TO_MERGE=NO` hasta completar una sesión autenticada de lectura y una prueba controlada sin datos reales.
2. Revisar únicamente el diff `e10ba788..HEAD` y los artefactos de las pruebas de cinco flujos.
3. Tras autorización humana, fusionar por el mecanismo normal protegido; el workflow de PROD construirá un artefacto nuevo y actualizará `PROD_SOURCE_SHA.txt`.
4. Verificar que `PROD_SOURCE_SHA.txt` coincide con el SHA promovido antes de ejecutar las cinco comprobaciones autenticadas.
5. Ejecutar primero selección sin confirmar; las acciones masivas solo en registros QA autorizados o en un entorno aislado equivalente.

## Rollback

- Código anterior: `e10ba788b60215e5b7130e4419e1c0ec8ed1508e`.
- Artefacto anterior: commit `gh-pages` `73619cec` (snapshot del SHA anterior).
- Si la promoción falla, restaurar el artefacto inmutable asociado a `e10ba788` mediante el workflow de rollback aprobado; no revertir datos ni desplegar Edge Functions.
