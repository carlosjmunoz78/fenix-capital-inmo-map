# JARVIS · Git readonly parity LAB · 2026-11-09

## Alcance y estado

- Empresa `fenix`; motor `CONSOLE-001`; versión `LAB V0`.
- Rama aislada: `cerebro/jarvis-git-parity-lab-20261109`, basada en `main@862ee543036070bc2cbb3ccaffc6c81af6d6a225`.
- Estado: **LAB GREEN / PROD NOT PROMOTED**. App, CRM, `main`, `gh-pages`, DNS y Trading no se modificaron.
- Coste adicional contratado 0 €; prueba GitHub Actions sin rearm, con runner estándar.
- Este LAB no es un despliegue de App PREPROD ni una activación de worker.

## Contrato existente encontrado

`jarvis-git-gateway-v1` (PROD) y `jarvis-git-gateway-v1-preprod` soportan operaciones de inspección `STATUS`, `DIFF`, `CI_READ`, `COMPARE`; la ruta es `POST /inspect` y **encola** un job `git.safe.v1` en vez de devolver un resultado ejecutado.

`jarvis-work-gateway-v1` expone `GET /repo/head` y permite comprobar el SHA antes de inspección. El cliente actual `src/jarvisWorkApi.ts` ya reutiliza `supabase.auth.getSession()` y token de sesión, con el publishable key de su entorno. No se añadió un secreto en el navegador.

- PROD: `cerebro/jarvis-core-prod-candidate-20261103`.
- Gateway de pruebas antiguo: `cerebro/jarvis-work-codex-complete-20261102`.
- Ambos deben coincidir con la rama y el entorno comunicados por `repo/head`; cualquier discrepancia bloquea la solicitud.

El consumidor `JARVIS Git Safe PREPROD + PROD Worker` fue desactivado manualmente en GitHub por su `rearm` automático. **No reactivarlo** para esta prueba: si se encolan solicitudes sin consumidor, el estado `QUEUED` debe mostrarse como pendiente y nunca como `GREEN`.

## Cambio aditivo aislado

- `src/JarvisGitReadonlyInspector.tsx`: botones **Estado Git**, **Diff Git**, **CI Git**, **vs main**. Solo inspección; sin botones de guardar, push, rollback ni permisos nuevos.
- `src/jarvisWorkApi.ts`: llamada tipada `inspectJarvisGit` al gateway ya existente; no se crea backend nuevo.
- `src/CerebroJarvisWorkConsole.tsx`: se inserta inspector dentro de la pestaña Herramientas, conservando el resto del componente.
- `tests/cerebro-jarvis-v1-preview.spec.ts`: 2 pruebas nuevas de inspección encolada y bloqueo por rama incorrecta; se adapta la antigua prueba de UX a nombres V2, sin cambiar código de producción.
- `.github/workflows/cerebro-jarvis-git-parity-lab-oneshot-20261109.yml`: ejecución one-shot sin `workflow_dispatch` ni auto-rearm, `contents: read` y sin despliegue.

## Evidencia física de CI (LAB)

- Run inicial de Git parity, mocks: [42537165010](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42537165010) · **GREEN 2/2**.
- Suite completa UI + Git: [42537301962](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42537301962) · **GREEN 6/6**.
- Endurecimiento de entorno y suite completa repetida: [42537501794](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42537501794) · **GREEN 6/6**.
- Incluye TypeScript/Vite build, navegación de proyectos, conversación con gateways simulados, tipografía, dictado en error, llamadas Git de solo lectura y fail-closed por rama.
- Estas pruebas NO acreditan ejecución Git real a través de un consumidor ni validez de credenciales personales caducadas.

## Bloqueos antes de cualquier promoción a PROD

1. Autenticación E2E renovable, sin secreto JWT de sesión humana de corta duración en GitHub. Preferible identidad de prueba segregada `DIR-TEST` con credenciales cifradas y sesión efímera adquirida durante cada ejecución; **requiere auditoría y provisión seguras, no introducir credenciales en código, chats ni logs**.
2. Verificación real de la integración UI → Git Gateway → job `SUCCEEDED`, mediante un único consumidor finito, sin auto-rearm y sin modificaciones sobre ramas protegidas.
3. Aceptación física de la voz y micrófono en el dispositivo real; el manifiesto de voz personalizada JARVIS aún consta bloqueado para PROD.
4. Comparación completa OLD vs NEW y ensayo de restauración en entorno aislado; un artefacto offline no equivale a rollback de un dominio público.
5. Tribunal, pruebas de permisos, observabilidad, costes, backup y autorización de promoción.

## Rollback / rebuild

El cambio está aislado en rama técnica. `main@862ee543036070bc2cbb3ccaffc6c81af6d6a225` conserva íntegro el sistema original; descartar el branch o sus cambios no altera producción. Backups existentes de `main` y `gh-pages` son las ramas `backup/20261108-jarvis-prod-cutover-*` ya verificadas. La App pública anterior permanece en `gh-pages@01650c6fb728aa9d41dc4877dd4bee243372be68`.

**Regla: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.**
