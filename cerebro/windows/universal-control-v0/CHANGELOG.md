# CEREBRO Windows Universal Control · changelog

## 2026-11-04 · 0.1.0 · LAB_BUILD_GREEN / WINDOWS_PHYSICAL_PENDING
- Recuperados handoff de Biblioteca, traspaso GitHub y diagnóstico Windows. Confirmado SHA base `381b87935dd8f7533ff1c54d1e07ad20531f5cb1`.
- Detectado y preservado AccessBoot portátil v0.5.0 y contratos de Device Universal; no se replica el ejecutor.
- Añadida bandeja Win32 nativa Go sin dependencias nuevas, con autoarranque HKCU propio y sin consola (PE Windows GUI).
- Monitor local `GET /health` estrictamente limitado a `127.0.0.1:{8765,8766,8767,8768}` y sin conexión externa.
- Activar/Pausar/Comprobar/Reiniciar monitor, salir y desinstalar autoarranque propio; una única instancia.
- Copia DPAPI de la clave de arranque propia, instalación inmutable por versión y fail-closed si el nombre del valor está ocupado por otro programa.
- Build y tests cruzados Linux/Windows. Todavía no hay prueba física de tray, reboot, backup/rollback real ni Gateway.
- No se ha tocado ninguna configuración del PC, `main`, App/CRM PROD, Supabase PROD o Trading.
