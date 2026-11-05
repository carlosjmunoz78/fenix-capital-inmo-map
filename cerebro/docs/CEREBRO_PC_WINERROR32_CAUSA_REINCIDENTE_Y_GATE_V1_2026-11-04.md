# CEREBRO PC · WinError 32 recurrente · Guardia anti-reinstalación V1

**Fecha:** 2026-11-04 · **Entorno:** PREPROD · **Estado:** causa probable concreta + gate definido; corrección física PENDIENTE.

## Evidencias

1. Historial previo (18-09-2026): al ejecutar `CEREBRO-Device-Agent.exe` sin argumentos o con un flujo de emparejamiento que reinstalaba, aparecía WinError 32 ("otro proceso está usando el archivo"). La solución documentada consistía en modo agente `--agent`; para pairing se utilizaba `--agent --open-pairing 600`. No reabrir pairing ahora ni suponer credenciales.
2. Historial previo (19-10-2026): conflicto de reemplazo/reapertura del Device Agent antiguo; el diseño side-by-side v0.2.2 evitaba sobrescribir ejecutables bloqueados. No reintentar desbloqueos que ya fallaron.
3. Recibo físico v0.5 04-11-2026 11:42:36 CET: Browser 8765 OK, Evidence 8767 OK; V0.5 inició `CEREBRO-Device-Agent.exe` legado PID 11252, pero 8766 NO respondió. El usuario vio la misma ventana WinError 32 anterior. Controller 8768 bloqueado por `UNKNOWN_FLAGS_FAIL_CLOSED`.
4. Auditoría local del **código del paquete V0.5** `src/main_windows.go`: después de validar HKCU Run/hash, ejecuta `exec.Command(it.exe, it.args...)`; para el fallback `CEREBRODeviceAgent`, la función `SafeArgs` permite args vacíos y no exige `--agent`. Por eso un Run legado con modo instalador o sin args puede reproducir el mismo error de auto-copia. **El contenido exacto del valor HKCU Run y el archivo bloqueado no están acreditados**, así que la causalidad es muy probable pero no confirmada al 100 %.

## Guardia de seguridad a incorporar antes de cualquier nuevo lanzamiento

- No volver a ejecutar V0.5 ni el `CEREBRO-Device-Agent.exe` antiguo sin argumentos; no matar procesos, borrar archivos, renombrar binarios en uso ni alterar arranques.
- **DENY `LEGACY_AGENT_MODE_NOT_EXPLICIT`**: prohibir arranque del Device Agent heredado si el modo de servicio no es explícito, comprobado contra el CLI/contrato de esa versión. Nunca invocar modos de instalación/copia desde recuperación.
- Priorizar **el Device Agent Universal side-by-side ya construido**, pero leer íntegramente el VBS launcher y la ruta/binario destino, verificar SHA-256, propietario del listener, políticas y dependencias antes de ejecutar.
- Detectar si el PID 11252 sigue vivo, y posibles dos instancias; no iniciar duplicados por puerto 8766 en falso negativo. Confirmar health por HTTP Go nativo más diagnóstico de proceso.
- Mantener 8765 y 8767, V0.2 y su `CEREBRO_ESTADO_ACTUAL.txt`, Gateway sin enlazar, Trading REAL aislado. Solo PREPROD.
- Para 8768 revisar el **valor posicional exacto de forma LOCAL y saneada** contra un contrato conocido antes de autorizar. No admitir subcomandos a ciegas.
- Cualquier reparación futura necesita preflight snapshot, rollback físico, OLD vs NEW y recibo TXT, sin pedir al usuario otra captura del mismo WinError.

## Estado

HECHO: correlación histórica, recibo físico y auditoría del launcher del paquete V0.5.
PARCIAL: 2/4 listeners confirmados por TXT del equipo.
POR AUDITAR: valor HKCU Run legado completo, destino del VBS universal, PID/locks activos, servicio 8768, Gateway E2E.
NO HECHO: recuperación final, cambio a PROD, control remoto del PC, reboot/rollback físico.

**Instrucción de continuidad:** conservar → entender → envolver → probar → mejorar → migrar. No repetir ventanas ni pruebas anteriores; el usuario informó que el mensaje es el mismo que compartió antes.
