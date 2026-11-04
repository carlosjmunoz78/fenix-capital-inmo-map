# PC-001 · V1 ordenación de arranque por usuario y recuperación acotada

**Fecha:** 2026-11-04
**Estado:** `CANDIDATE_STATIC_GREEN_65_65`, preparado para ensayo físico Windows; todavía **no instalado**.
**Empresa/identidad:** `fenix / PC-001 / PREPROD / pc001-windows-v1`.
**Coste:** cero nuevas suscripciones. No se han tocado PROD, Trading ni la rama principal.

## Evidencia que sustenta la intervención

El usuario remitió `CEREBRO_PC001_RECUPERACION_RESULTADO.json` (UTC 17:49:30.604): primero 8765, 8766 y 8768 estaban OFF y 8767 ON; una ejecución secuencial con lanzadores y huellas digitales verificadas recuperó los tres, final **4/4 GREEN**, sin mutaciones de registro/tareas/servicios/binarios, ni terminar procesos. El trabajador Gateway local informó aún `HOLD_RETRY_BACKOFF` en esa instantánea.

Consulta posterior de Supabase **PREPROD** `hnqlnvakzaywtafeiybt` (UTC 17:57:07.968): agente del mismo dispositivo `status=ONLINE`, `last_seen_at=2026-11-04T17:54:14.514Z`, heartbeat **173 s** de antigüedad. **La reconexión del Gateway está demostrada en ese corte de tiempo**. No confundir con futura autonomía, control remoto de escritura ni PROD.

## Paquete de autoarranque ordenado

- Artefacto: `CEREBRO_PC001_ARRANQUE_ORDENADO_PREPROD_V1.zip`.
- SHA256 ZIP: `de411dc426c6053c39205dc0709ee45f06a8cb5c10b88cf65875435d59f97612`.
- Biblioteca: `/CEREBRO_OS/WINDOWS_UNIVERSAL_V0_2026_11_04/CEREBRO_PC001_ARRANQUE_ORDENADO_PREPROD_V1.zip`.
- Incluye source completo PowerShell, 3 CMD, `test_static.py`, `README.md`, `SHA256SUMS.json`. Los fuente individuales están en ZIP, no aún sincronizados en el repositorio.
- Pruebas en container: 65/65 verificaciones estáticas PASS; ZIP CRC y SHA-256 de cada archivo PASS. **PowerShell Windows y persistencia real aún por verificar**.

## Plan de migración reversible

Instalador `INSTALAR_ARRANQUE_ORDENADO_PC001.cmd`:

1. Exige identidad exacta del PC; monitor `PREPROD` no mutante y los **cuatro puertos sanos** antes de migrar.
2. Verifica que las únicas tres entradas Run a ordenar siguen apuntando exactamente a los ejecutables conocidos, con hashes, tamaños, alcance de directorio y parámetros aprobados: `CEREBROBrowserAgentHost`→ Browser 8765 (sin args), `CEREBROUniversalDeviceControllerV2`→Controller 8768 (literal `host`) y `CEREBRODeviceAgentUniversalV023`→Launcher V07 8766 (literal `--startup`). Si difieren, HOLD.
3. Guarda en DPAPI CurrentUser los 3 valores Run originales; verifica backup descifrado en memoria; conserva dichos ejecutables intactos.
4. Sustituye solo esas tres entradas por un único Run `CEREBROPC001OrderedStartupV1` que invoca PowerShell al **inicio de sesión del usuario**. No toca otras entradas, el componente 8767, Startup, tareas, procesos, servicios, PROD, secretos o Trading.
5. Supervisor de sesión: espera **180 segundos** después de iniciar sesión, inspecciona 8765/66/67/68. Ante cualquier caída, espera **180 segundos adicionales** (incluido tras suspensión/reanudación) y revalida; si 8767 está sano, invoca secuencialmente los ejecutables hash-pinned del recuperador físico adaptado a la copia DPAPI, con guardas de proceso activo, puerto ocupado, rangos excluidos y marcador V07. Reintentos limitados **máximo 2 por hora, separados 15 min**. No borra marcadores ni ejecuta binarios originales en modo instalador.
6. Verificación en sesión con `COMPROBAR_ARRANQUE_PC001.cmd` → `CEREBRO_PC001_ARRANQUE_ESTADO.json`, incluida frescura del worker y worker Gateway existente. El Gateway mantiene su propio worker separado; este paquete no lo altera.
7. Reversión `REVERTIR_SOLO_ARRANQUE_ORDENADO.cmd` → `CEREBRO_PC001_ARRANQUE_ROLLBACK.json`: restaura solo los tres Run de backup DPAPI, retira solo el nuevo Run y comunica parada al nuevo worker. Si encuentra diferencias inesperadas, no sobrescribe cambios ajenos.

## GATES DE ACEPTACIÓN NO CERRADOS

- Instalación PREPROD real de este nuevo sistema en PC-001: **PENDIENTE**.
- Comprobación inmediata de configuración, local 4/4 y trabajador: **PENDIENTE**.
- Reinicio físico y nueva sesión **+ 3 min**, cuatro servicios sanos y ausencia de WinError 10013: **PENDIENTE**.
- Gateway con nuevo heartbeat posterior al reinicio: **PENDIENTE**.
- Rollback físico y prueba de reinicio con rollback: **PENDIENTE**.
- Acceso universal a escritorio/teclado/archivos mediante políticas exact-scope: **PENDIENTE**.
- Captura AccessBoot V0.5.0 y EXE único reutilizable en segundo PC: **PENDIENTE**.
- Wake-on-LAN remoto: **HOLD** sin relé siempre activo acreditado.

**NO trasladar este paquete anclado a identidad PC-001 a otros PC.** El objetivo siguiente sigue siendo AccessBoot universal cuando este contrato quede aceptado físicamente.
