# B10 · Runbook certificación y autonomía PROD por fases (CUT02)
**PR:** https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/20 · base PR #19 B9 DRAFT · `main` intacto.
1. Antes: revisar `STATE_B9_CUT04`, documentación B8/B7/B6, verificado `main` no modificado y 179 IDs originales.
2. Revisar plan canónico en Biblioteca `/ZEUS/JARVIS/JARVIS_PLAN_EJECUCION_10_BLOQUES_V2_2026-11-03.md`. B10 7 fases en orden. Cada una requiere todas las anteriores, sin saltos.
3. Ejecutar en checkout aislado de branch B10: `node --test zeus/jarvis/core/*.test.mjs` Node 24. HEAD código `e88ea6a5cc65bd602e6af8ee9afee68daac013ad`, CI `41796775749`: 490/490 PASS.
4. Observar B3/B4 SOLO con SELECT sin activar control. Estado real fenix/PROD ambos `enabled=false`, `kill_switch=true` (2026-11-04); no anular.
5. Confirmar SHA real servido, Gateway y OWNER_ROOT con fuente autenticada. No asumir que HTTP 200 o build PASS equivalen a PROD.
6. B2 13 pruebas reales, incluyendo PC + móvil con mismo OWNER_ROOT pero sesiones propias, misión compartida, reintento concurrente único y reinicio probado. No generar pruebas ficticias ni copiar tokens a chat.
7. Las métricas reales, terceros, progreso, coste y sistema P23 deben tener recibos inmutables y revisión de tercero, con límites > seguridad.
8. Cada fase entra como `NO_GO` hasta verificación externa. El certificador NUNCA despliega, concede permisos, gasta, altera kill switch ni publica.
9. INCIDENTE: cerrar/revertir solamente PR20, sin tocar PR19/18/17/16/main o PROD. No "rollback" de Supabase (no se realizaron cambios).
10. REBUILD: checkout commit GitHub de PR20 y tests Node; `git revert` solo de cambios B10 en branch, nunca `force push` ramas protegidas.
11. PROMOCIÓN: solo por autoridad existente tras QA independiente, backup/rebuild, PREPROD si aplica o integración PROD aditiva con flags OFF, canary medido, auditoría y rollback.
12. COSTE: nuevas suscripciones=0, trabajo determinista gratuito; gastos efectivos GitHub Actions se deben conciliar.
