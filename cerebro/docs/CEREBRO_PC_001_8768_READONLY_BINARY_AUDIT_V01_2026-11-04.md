# CEREBRO PC-001 · 8768 read-only binary/run audit V0.1 · 2026-11-04

**Estado:** programa compilado, pruebas Go y reconstrucción reproducible PASS. Windows físico **NO PROBADO**. PREPROD, coste adicional 0 €.

## Precedente verificado
- El propietario ejecutó `CEREBRO_PC_8766_CORRECCION_V07.exe` y adjuntó `CEREBRO_PC_8766_CORRECCION_V07.txt`, 2026-11-04 12:57:45 CET.
- Resultado V0.7: `8766: RECUPERADO_HEALTH_OK_PUERTO_CORRECTO`; backup y readback DPAPI OK; nuevo autoarranque side-by-side después de health; rollback disponible; originales intactos.
- 8765 y 8767: OK en comprobaciones previas, no verificados de nuevo mediante prueba física tras reboot.
- 8768: NO HEALTH; anteriores recuperaciones V0.4/V0.5 detectaron **un argumento posicional oculto** y fallaron con `UNKNOWN_FLAGS_FAIL_CLOSED`. No asumir el valor ni saltar gate; no lanzar binario.
- Gateway: NO CONECTADO; E2E teclado/ratón/remoto, reboot y rollback físico pendientes.

## Herramienta de solo lectura sin mutaciones

- Archivo Windows x64 GUI: `CEREBRO_PC_8768_INSPECCION_V0_1.exe`; SHA256 `9fb5821d9d2997014b488d1404a8cbeed0d0ea4f65e3d2de2bb14ef126e3c2d4`.
- ZIP de artefacto y código fuente Go: `CEREBRO_PC_8768_INSPECCION_V0_1_PREPROD.zip`; SHA256 `e15281ff9b1cf5868b996c75c13146f6b9006e0fa9af1638389d4db758666676`.
- Solo lee `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\CEREBROUniversalDeviceControllerV2`; parsea la cadena de arranque; comprueba que apunta al nombre exacto `CEREBRO-Universal-Controller-V2.exe` dentro de `LocalAppData\CEREBRO`; valida SHA256 exacto del inventario físico `78733cce3f2473205f8cf7bb50ee9a73901dd58dcaf2df10ac2748eb6a0aa8ef`, PE, límites de tamaño y symlinks.
- El informe `CEREBRO_PC_8768_RESULTADO.txt` contiene la forma saneada de los argumentos (los valores arbitrarios son hashes cortos; no hay rutas privadas ni comandos completos). Si el archivo concuerda, se produce en Escritorio `CEREBRO_PC_8768_ANALISIS.zip` que contiene **solo el ejecutable 8768 y metadatos saneados**, para que el propietario lo comparta voluntariamente.
- Ningún agent/controller/binario del PC se ejecuta; 0 procesos iniciados; no crea/modifica autoarranques, claves, tareas, Gateway ni servicios, no toca cámara/micrófono ni usa red, no requiere administración.
- Tests `go test -count=1` PASS, `go vet` Linux/Windows PASS, compilación Windows amd64 PASS, compilación cruzada tests PASS, determinismo de rebuild PASS; ZIP integrity PASS.

## Próximos gates

1. **Única ejecución física** de auditoría 8768, lectura TXT o ZIP. No ejecutar V0.5/V0.6; conservar V0.7 y Monitor Z azul.
2. Inspección estática del binario real y contrato de argumentos para autorizar eventual start o repararlo side-by-side sin pérdida de configuración.
3. Gateway autenticado + ACL exactas, dispositivo multiempresa command envelope V2, readback E2E control escritorio.
4. Reboot físico controlado con especial atención a `CEREBRO-Device-Agent.cmd` de Startup aún por auditar; probar rollback físico V0.7 y persistencia 8765/8766/8767.
5. Registrar pruebas, dependencias, backups, rollback, costes y autonomía; no considerar PC finalizado antes.

Preservar PC-001 independiente de BRX-001, MOB-001 y TAB-001. No afectar App/CRM/Supabase PROD/Trading.

Regla: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
