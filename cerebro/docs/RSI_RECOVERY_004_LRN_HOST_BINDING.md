# RSI-RECOVERY-004 · LRN-001 HOST BINDING

Fecha: 2026-10-08
Estado global: PARCIAL · SOFTWARE_GREEN / PHYSICAL_HOST_POR_AUDITAR
Entorno: PREPROD exacto
Coste adicional objetivo: 0 EUR
PROD authority: false
Trading access: false

## Objetivo

Convertir `LRN-001` de worker one-shot probado a runtime persistente 24/7 sin comprar infraestructura y sin depender de ChatGPT Scheduler, Make, Supabase para jobs largos ni del Browser Bridge.

## Inventario y decisión

1. GitHub Actions permanece como CI/scheduler de repositorio, no se trata como host persistente de CEREBRO.
2. Supabase no se selecciona como host de `LRN-001`: el proyecto reserva Supabase principalmente para core transaccional y evita usarlo como runtime de jobs largos/learning pesado.
3. Existe evidencia histórica de un PC Windows utilizado por CEREBRO/Browser Bridge, pero no existe en esta recuperación evidencia viva suficiente para afirmar que el Browser Bridge arranca solo y permanece estable tras reboot. Por tanto el Browser Bridge NO es dependencia de `LRN-001`.
4. Se selecciona como binding V0 un host Windows local ya existente, usando únicamente Node.js + Windows Task Scheduler nativo. El binding queda preparado para instalarse en el mismo PC u otro Windows ya disponible, sin suscripción nueva.

## Implementación HECHA

### Runtime host-neutral

`cerebro/runtime/rsi-learning-host.mjs`

- daemon PREPROD-only;
- instancia tenant-scoped por `company_id` + `LRN-001`;
- inbox local no destructivo;
- receipts SHA-256 idempotentes;
- heartbeat atómico;
- kill switch por archivo;
- single-writer host lock + worker lock;
- ledger durable local `learning.v8`;
- rechazo de eventos cross-company;
- preservación de source event files;
- backup con SHA-256 + manifest;
- restore solo con kill switch activo, lock ausente y confirmación explícita;
- pre-restore backup automático;
- anti-loop: al tercer error de la misma familia cambia estrategia a `HOLD_SAME_ERROR_FAMILY`;
- coste adicional 0 EUR;
- `prod_authorized=false`, `prod_write_authorized=false`, `trading_access=false`.

### Windows host binding

`cerebro/host/windows/Install-CerebroLrn001Host.ps1`

- copia runtime/skills a una ruta versionada bajo `%ProgramData%\CEREBRO\host-code`;
- genera manifest SHA-256 de la copia instalada;
- crea config PREPROD separada de código;
- crea Scheduled Task `CEREBRO-LRN-001-PREPROD`;
- trigger nativo `AtStartup`;
- cuenta `SYSTEM` / ServiceAccount;
- `StartWhenAvailable`;
- restart acotado a 3 intentos;
- `MultipleInstances IgnoreNew`;
- no depende de sesión Chrome ni Browser Bridge;
- no usa red, API pagada ni credenciales nuevas;
- si existe código de la misma versión, no lo pisa salvo `-ForceReinstall`; con reinstall explícito crea snapshot previo;
- config anterior se preserva antes de sobrescribir.

`Start-CerebroLrn001Host.ps1`
- ejecuta únicamente Node local + host daemon;
- logs locales append-only por día.

`Get-CerebroLrn001Health.ps1`
- exige Task Running;
- heartbeat fresco;
- `environment=PREPROD`;
- `engine_id=LRN-001`;
- no autoridad PROD;
- solo entonces devuelve `physical_host_confirmed=true`.

`Uninstall-CerebroLrn001Host.ps1`
- desregistra la ejecución;
- preserva state, ledger, backups, inbox y config por defecto;
- borrar solo runtime code requiere switch explícito.

`INSTALL_CEREBRO_LRN001_PREPROD.cmd`
- launcher de un clic;
- solicita elevación UAC;
- instala el binding PREPROD con policy/security/local-persistence habilitados para este scope aislado.

## Evidencia CI

Recovery gate extendido para host runtime + Windows binding. La suite incluye:

- PREPROD exacto y 0 EUR;
- persistencia idempotente;
- receipts + source preservation;
- HIGH_RISK hold;
- kill switch;
- tenant isolation;
- anti-loop same-family;
- backup/checksum/restore con preservation backup;
- contrato de Windows Task Scheduler;
- uninstall no destructivo;
- health fail-closed.

Run de referencia del primer host binding completo: `37781020591` sobre head `5ed3edefd75ef35fabdf4035f29c3cbfa314ebb3`, step `Recovered RSI runtime, PREPROD persistence, host binding, governance and bridge regression tests` = SUCCESS.

## Lo que NO está demostrado todavía

- No se afirma que el Scheduled Task esté instalado físicamente en el PC Windows.
- No se afirma heartbeat físico GREEN.
- No se afirma reboot/restart físico probado.
- No se afirma ingestión automática desde Skill Factory; el inbox es el boundary para `RSI-RECOVERY-005`.
- No se autoriza PROD.

## Gate físico para cerrar RSI-RECOVERY-004

En el host Windows real:

1. ejecutar el launcher one-click desde una copia exacta de esta recovery branch;
2. comprobar Task `CEREBRO-LRN-001-PREPROD` RUNNING;
3. comprobar `Get-CerebroLrn001Health.ps1` = GREEN;
4. inyectar un fixture LOW y verificar ledger + receipt + heartbeat;
5. inyectar fixture HIGH y verificar `HUMAN_REQUIRED=HIGH_RISK` sin persistencia indebida;
6. activar `KILL_SWITCH` y verificar 0 nuevas persistencias;
7. probar backup + verify;
8. restore de prueba con kill switch y pre-restore preservation backup;
9. reiniciar el task/proceso y comprobar restart/idempotencia;
10. cuando sea posible, reboot físico del PC y verificar auto-start + heartbeat fresco.

Solo tras estos puntos el host pasa a `CONFIRMED_OPERATIONAL_PREPROD`.

## Rollback

- parar/desregistrar Scheduled Task;
- mantener state/ledger/backups/inbox/config;
- usar backup manifest SHA-256 si se requiere restore;
- no tocar Browser Bridge/App/CRM/Supabase/SEO/Notion/WordPress/Training/Trading.

## Next block

Después del GREEN físico: `RSI-RECOVERY-005 · REAL EVENT WIRING`: conectar `skill-improvement-events` / Skill Factory al inbox de `LRN-001`, con outbox/receipt idempotente, sin JSON manual y sin autoridad PROD.
