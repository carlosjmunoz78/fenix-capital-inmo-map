# Candidato PRE-LANZAMIENTO · Dirección / Belén

Fecha: 2026-08-29

## Candidato técnico validado
- Rama: `preprod-app-phase1`
- SHA candidato: `110685d281225cf3750d88275a132dfb3de84e0e`
- Workflow PUSH: `33270696978` / #2730
- Resultado: `success`
- Build: `success`
- Browser QA: `success`
- Upload dist: `success`
- Upload Playwright report: `success`
- Build GitHub Pages PRE-PROD: `success`
- Publicación snapshot PRE-PROD: `success`
- Snapshot `gh-pages`: `11da68eb68b98a8f2db7d6dbfe38be23c06cc96f`
- Mensaje exacto: `deploy: PRE-PROD Pages snapshot 110685d281225cf3750d88275a132dfb3de84e0e`

## Qué demuestra este candidato
Este SHA deja en verde el alcance PRE-PROD actualmente construido para Dirección/Belén, incluido el gate de promoción a PROD, aislamiento de funciones Edge `-test`, almacenamiento de sesión PRE-PROD, RBAC fail-closed, navegación autorizada, confirmaciones sensibles, visor documental, casos especiales, recuperación y rollback documentados.

## Qué NO demuestra
- No demuestra que `main` sea una APP PROD preparada.
- No demuestra que exista una configuración PROD separada y operativa.
- No autoriza fusionar PR #2.
- No autoriza tocar WordPress ni Supabase PROD.
- No autoriza importar expedientes reales ni arrancar el piloto.
- No convierte los fixtures DEMO de Herencias/Obras Nuevas en datos reales.

## Gate restante antes de uso real
1. Recibir orden explícita para preparar/activar PROD.
2. Crear o verificar un entorno APP PROD separado de PRE-PROD.
3. Configurar frontend, auth storage, backend, Edge Functions, secretos y almacenamiento propios de PROD.
4. Mantener RBAC y fail-closed equivalentes al candidato validado.
5. Desplegar inicialmente con datos controlados.
6. Ejecutar smoke test y QA de login, navegación, lectura, escrituras sensibles y rollback en PROD.
7. Confirmar punto de rollback reproducible.
8. Solo entonces iniciar uso real limitado con Dirección/Belén.

## Capacidades aplazadas hasta uso real
OCR transversal, audio→texto, chat interno CEREBRO completo, evolución avanzada de notificaciones/búsqueda, automatizaciones derivadas de fricción real, activación progresiva de otros roles y capas visuales no necesarias para el piloto.

## Regla operativa
Este documento congela evidencia del candidato PRE-PROD. No es una orden de promoción. Cualquier trabajo que implique `main`, APP PROD, WordPress o Supabase PROD requiere autorización expresa.
