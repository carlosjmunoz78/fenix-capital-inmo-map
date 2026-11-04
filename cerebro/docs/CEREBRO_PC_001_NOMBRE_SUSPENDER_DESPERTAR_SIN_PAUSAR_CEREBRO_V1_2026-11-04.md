# CEREBRO OS · PC-001 · Identidad, nombre y suspensión/despertar

Fecha: 2026-11-04. Estado: CONTRATO Y LÓGICA DETERMINISTA DEFINIDOS Y PROBADOS; integración física de Wake-on-LAN y Gateway PENDIENTE. Coste adicional previsto 0 €.

## Requisito del propietario, con prioridad sobre diseños anteriores

**CEREBRO NO SE PAUSA.** No existe ni se debe ofrecer `PAUSE_CEREBRO` como acción operativa de usuario. El usuario quiere **suspender el ordenador completo y despertarlo posteriormente**. Mientras un PC está suspendido, su agente no ejecuta órdenes: CEREBRO CENTRAL sigue en marcha, coordina otros dispositivos y ordena que un relé activo despierte el PC. Al despertar el sistema, los servicios se reconectan y se hace readback autenticado antes de reanudar trabajos. No confundir esto con apagar o hibernar.

## Instalación universal futura para ordenadores de sobremesa y portátiles Windows

- Entrega final objetivo: **un único instalador `.exe`** para Windows, con inventario, backup, versiones, prueba OLD vs NEW, rollback, rebuild y ejecución side-by-side. **No terminado**. Debe preservar los servicios 8765, 8766, 8767 y 8768 recuperados hoy y la bandeja Z azul. No generar cuatro nuevos ejecutables de agentes.
- En primera ejecución autorizada, se crea o reutiliza el ID físico permanente `canonical_device_id` (no derivarlo de nombre visible), se valida y se registra frente al Gateway PREPROD con credenciales y políticas exact-scope. **No asumir que un `health` local o un registro histórico LAB equivale a enlazado vigente.**
- Asignar nombre visible automático `PC · <hostname>` (con fallback si no hay hostname válido). **No cambiar el nombre de Windows**. El propietario puede renombrarlo las veces que quiera desde CEREBRO: misma identidad, mismo dispositivo, no genera otra licencia ni requiere reemparejar. Control de revisión/idempotencia, auditoría y autorización de propietario. Sin costo.
- Canales independientes PC-001 / MOB-001 / TAB-001 / BRX-001: nombre y suspensión aquí se aplican exclusivamente a PC-001. No confundir la extensión universal con el Device Agent del PC.

## Suspender PC

- Comando autorizado `SUSPEND_PC` desde la consola central, por destinatario físico y exact-scope (`company_id`, `engine_id`, `environment`, `version`, `device_id`, política, request e idempotencia). Registro de auditoría. La acción afecta a **Windows**, no al Gateway ni a otros equipos.
- Preflight: dispositivo encendido y agente autenticado; no operación crítica en curso; despertar verificado; relé activo capaz de despertarlo; sin acceso a Trading REAL ni PROD.
- Implementación Windows futura: API nativa `SetSuspendState(FALSE, FALSE, FALSE)` o equivalente probado con privilegio apropiado **sin deshabilitar eventos de despertar**. No ejecutar hasta verificar la capacidad y que el usuario lo haya ordenado.

## Despertar PC

- `WAKE_PC` desde consola central. El PC durmiente **no puede despertar escuchando el Gateway por sí mismo**. Requiere un **relé siempre activo** accesible desde el Gateway y situado en la red local, o soporte equivalente (router/AP/placa de gestión compatible) que pueda enviar Wake-on-LAN / magic packet u orden OEM autorizada.
- No abrir puertos públicos sin VPN/relay autorizado. Claves y MAC sólo en configuración cifrada y restringida; ningún token en recibos. El relé tiene identidad, permisos, expiración, nonce y auditoría propios; no se le concede control general de Windows.
- Al recibir orden: relé despierta el dispositivo → el PC reporta heartbeat autenticado → recupera trabajos idempotentes → la UI confirma **despertado** solo tras readback de ese mismo dispositivo. Si no hay wake hardware/network o relé: `WAKE_UNAVAILABLE`, nunca éxito inventado.
- Wake-on-LAN depende de BIOS/UEFI, NIC y controlador de red, estado de energía (S3/S0ix), alimentación y conectividad. Ethernet suele ser la vía más fiable; Wi-Fi/USB docks y baterías varían por equipo. **No prometer despertar todos los portátiles** sin prueba en cada uno.
- Si todos los PCs están dormidos y no hay router/nodo siempre encendido con capacidad de WOL, el Gateway por sí solo no los despertará. Debe configurarse un relay disponible 24x7 sin suscripción adicional, cuando la infraestructura existente lo permita.

## Evidencia de este cambio

- Módulo lógico sin llamadas al sistema: `cerebro/windows/pc-001/device-lifecycle-v1.mjs`.
- Pruebas: `cerebro/windows/pc-001/device-lifecycle-v1.test.mjs`: 10/10 PASS ejecutadas localmente con Node.js el 04-11-2026.
- Estas pruebas son de la lógica y políticas, no pruebas físicas de Windows, Wake-on-LAN, enrolamiento o autoarranque.
- No se ha suspendido ningún ordenador, cambiado el registro de Windows ni insertado/actualizado datos en Supabase.

## Orden de cierre

1. Conservar los cuatro servicios locales GREEN y su configuración (física 2026-11-04 13:19:27).
2. Verificar en la instalación real el transporte autenticado hacia el Gateway PREPROD existente (`cerebro-device-gateway-preprod` v9), no desplegar otro Gateway.
3. Audit del hardware Windows por dispositivo (estados de suspensión y adaptadores, Wake-on-LAN; captura mínima y saneada) sin suspender ni cambiar BIOS en silencio.
4. Elegir relé WOL existente o autorizado con coste 0, probar el wake en una máquina no crítica; probar nueva sesión/heartbeat, readback, historial y seguridad.
5. Integrar suspensión Windows y nombres al `PC-001` autenticado, añadir UI de equipos en consola y empaquetar **un único EXE Windows** con backup, rollback probado y arranque tras reboot.
6. No declarar FULL OPERATIONAL hasta pruebas físicas de suspend → wake → rejoin, pérdida de relay, duplicados, reinicio Windows, rollback, seguridad y continuidad CEREBRO.

Fuentes normativas de Windows: Microsoft Learn `SetSuspendState` (PowrProf), `Networking power management for Modern Standby platforms` y `Modern Standby Wake Sources`.