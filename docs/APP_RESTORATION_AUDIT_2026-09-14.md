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

## Hallazgos confirmados en `main`

### R-001 · Navegación degradable a solo Inicio
`src/App.tsx` define `fallbackMenu` únicamente con `/inicio`. Si `/navigation` falla o devuelve vacío, el menú lateral queda reducido a Inicio. Esto coincide con la regresión observada en Mi Perfil.

**Estado:** ROJO. No se corrige todavía inventando un menú estático; primero se debe preservar el contrato de navegación por rol y añadir fallback seguro/caché sin ampliar permisos.

### R-002 · El micrófono completo existe pero no está montado
`src/AudioTranscriptionGuard.tsx` ya implementa SpeechRecognition en español, transcripción intermedia, botón Parar, edición del texto y cuatro modos: Corregir, Dar conocimiento, Tarea y Hablar con Ana.

Sin embargo `src/main.tsx` no importa ni monta `AudioTranscriptionGuard`.

**Estado:** ROJO con corrección de bajo riesgo preparada: montar globalmente, ocultándolo en login/recuperación.

### R-003 · Ana contextual aparece en Inicio
`src/AnaUniversalGuard.tsx` oculta `/`, `/perfil` y `/ana`, pero no `/inicio`.

**Estado:** ROJO. Requisito confirmado: excluir Inicio y la ventana de Ana del bloque contextual.

### R-004 · Corrección duplicada fuera del micrófono
`AnaUniversalGuard` muestra `Ana se ha equivocado`, aunque esa acción ya existe en el micrófono global.

**Estado:** ROJO. Retirar el acceso redundante una vez montado el micrófono global.

### R-005 · Ana contextual no muestra 3 prioridades reales
El encabezado usa `nextText()` con frases genéricas por tipo de ruta. No son tres prioridades calculadas con datos reales de la pestaña.

**Estado:** PARCIAL. No hardcodear tres textos. Requiere contratos por módulo y datos reales antes de sustituirlo.

### R-006 · Audio de evidencia sin transcripción automática
`AnaUniversalGuard` declara explícitamente que el audio se conserva como evidencia sin transcripción automática. El requisito restaurado exige transcripción donde se use audio operativo.

**Estado:** PARCIAL. Conservar evidencia actual; añadir pipeline de transcripción sin romper almacenamiento.

### R-007 · Bucket con nombre PREPROD en código PROD
`AnaUniversalGuard` usa `fenix-preprod-documents-test` como bucket de evidencia.

**Estado:** POR AUDITAR. No cambiar hasta comprobar contrato real de Storage y dependencias; el nombre puede ser legado o una regresión.

## Primer bloque de restauración

1. Montar `AudioTranscriptionGuard` global y ocultarlo en login/recuperación.
2. Excluir `/inicio` de `AnaUniversalGuard`.
3. Retirar botón contextual redundante `Ana se ha equivocado` tras confirmar el micrófono.
4. Mantener `Correcciones` como bandeja/revisión separada mientras se audita su uso.
5. No retirar RPCs SECDEF restantes hasta completar paridad de App/Gateway para capacidades recuperadas.

## Gates

- Sin writes de datos de cliente.
- Sin revocar capacidades durante la restauración.
- Build/TypeScript verde.
- QA visual y funcional antes de promoción.
- Rollback = volver al SHA previo de la rama/PR.
