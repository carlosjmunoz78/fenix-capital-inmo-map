# APP Fénix Capital · Reconciliación PRE-PROD · 21/08/2026

## Regla de trabajo
- No tocar `main`, PROD ni WordPress.
- Rama canónica de trabajo: `preprod-app-phase1`.
- Runtime visible: Vite/React + Supabase Auth + Edge Functions + schema `preprod_test`.
- El ZIP `FENIX_CEREBRO_OS_CHECKPOINT_06` se usa como especificación funcional y fuente de lógica, NO se copia encima del frontend porque pertenece a una arquitectura Vinext/servidor distinta.
- Mantener como patrón visual el sistema Dirección ya validado y las 44 capturas de Work.

## Hallazgo clave
El frontend runnable del repositorio y el Checkpoint 06 no son el mismo proyecto técnico. La vía rápida y segura es PORTAR al runtime real los contratos funcionales del Checkpoint 06, no sustituir el repositorio.

## Hecho en este checkpoint
1. Verificada rama `preprod-app-phase1`, commit histórico `63766c1cf9222ab55ed94fa9968568885a3ee10b`, workflow y `gh-pages`.
2. Verificado Supabase real del PRE-PROD y Edge Functions activas.
3. Añadidas RPC server-side:
   - `preprod_test_exp_list_server`
   - `preprod_test_inmo_list_server`
4. `fenix-app-gateway-test` actualizado a v3:
   - autenticación propia y fail-closed
   - `/health`
   - `/personal`
   - `/expedientes`
   - `/inmobiliarias`
   - proxy del resto hacia `fenix-app-api-test`
5. Añadida capa operativa frontend para rutas reales:
   - Expedientes
   - Bancos
   - Inmobiliarias
   - Tasaciones
   - Firmas
   - Documentación
   - Agenda/Tareas
   - Financieros
   - Informes
   - Buscador transversal
6. Contactos, Visitadores y Economía quedan visibles como NO conectados; no se inventan datos.
7. Eliminada visualmente la palabra `PRO` de la calculadora, manteniendo de momento las etiquetas internas antiguas para no romper QA histórico.
8. Vercel sigue desplegando automáticamente cada commit de PRE-PROD.

## Siguiente orden exacto
1. Esperar build/QA verde del último commit.
2. Conectar Contactos federados sin crear base duplicada.
3. Conectar Visitadores + gestiones B2B con aislamiento por cartera.
4. Conectar comunicaciones Email/WhatsApp y estados Brevo.
5. Llevar correcciones/aprendizaje de Ana al runtime PRE-PROD.
6. Completar fichas detalle y mutaciones controladas.
7. E2E Dirección / Financiero / Visitador con aislamiento A↔B.
8. QA visual contra las 44 capturas y cerrar diferencias.

## Criterio de cierre
Fase 1 solo puede marcarse lista cuando Dirección, Financiero y Visitador puedan trabajar con datos vivos autorizados, botones reales, auditoría, errores explícitos y sin mocks/snapshots silenciosos.
