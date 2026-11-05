# PC-001 · WinError 32: corrección guardada V0.6 · 2026-11-04

**Estado:** LAB BUILD GREEN; PREPROD WINDOWS PHYSICAL PENDING; **NO** se declara PC conectado ni reparación probada físicamente.
**Coste adicional:** 0 €. **PROD:** denegado. **Trading REAL:** aislado.

## Antecedente físico
Recibo de V0.5 2026-11-04 11:42:36 CET: 8765 OK; 8767 OK; 8766 no responde tras iniciar `CEREBRO-Device-Agent.exe` PID 11252; 8768 bloqueado por `UNKNOWN_FLAGS_FAIL_CLOSED` y un argumento posicional. Usuario confirma la ventana WinError 32 previamente observada. El archivo concreto bloqueado y el proceso propietario del bloqueo **no están identificados**.

## Fallo de diseño corregido en código V0.6
La V0.5 permitía invocar el antiguo Device Agent con argumentos vacíos tomados de su Run HKCU. En ejecuciones anteriores, el binario sin `--agent` había activado una ruta de copia/reinstalación capaz de provocar WinError 32. Esta relación es **hipótesis fuerte**, no causa confirmada mediante handle de archivo.

La V0.6:
1. **No hereda** orden de instalador del Run para el Device Agent; exige que el Run se pueda normalizar con garantías y, si se permite, ejecuta **solo `--agent`**. Deniega opciones de instalación, emparejamiento o argumentos adicionales.
2. Exige `CEREBRODeviceAgent` exacto, ruta dentro de LocalAppData/CEREBRO, symlink resuelto, binario conocido SHA-256 `0b8159b8211b2417a0cb8e8d9a3f94c2cf43fcecbd4b70f2328afdbeb7165b07`, V0.2 PREPROD y 8767 healthy.
3. No inicia ningún proceso si el nombre del agente ya está en la lista de procesos, aunque 8766 no responda. El inventario indisponible bloquea.
4. Crea marcador duradero con O_EXCL antes de un intento de lanzamiento. No repite automáticamente tras un fallo. Conservar el marcador para evidencia; no eliminarlo a ciegas.
5. No arranca ni termina Browser 8765, Evidence 8767, Controller 8768, el VBS 8766, ni el AccessBoot existente. Controller continúa bloqueado hasta obtener CLI real/contrato.
6. Conserva y copia por DPAPI la configuración Run sin alterarla; sin secretos en el informe.
7. Genera `CEREBRO_PC_RECUPERACION_V06.txt` en Escritorio; programa Windows GUI sin ventanas de consola.

## Evidencia del artefacto
- Binario: `CEREBRO_PC_RECUPERACION_V0_6.exe`; Windows amd64 PE32+ GUI; SHA-256 `49372f6508f5ca3e3e780848bbb1daa139bcad88ffb30911589a888a01cff127`.
- Paquete completo con `src/*.go` y pruebas: `CEREBRO_PC_RECUPERACION_V0_6_PREPROD.zip`; SHA-256 `9a8cef21ce55cadcddabbc9e377850b4697f9ed24006f3167d63438622b42730`.
- Biblioteca: `/CEREBRO_OS/WINDOWS_UNIVERSAL_V0_2026_11_04/CEREBRO_PC_RECUPERACION_V0_6_PREPROD.zip`. Fuente íntegra en este ZIP; **todavía no sincronizada como código fuente individual dentro del repositorio**.
- Ejecutado aquí: `go test -count=1 ./...` PASS, `go vet ./...` PASS, `GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go vet ./...` PASS, Windows GUI build PASS, cross-test compile PASS, rebuilt identical SHA PASS.
- **No hay aceptación física Windows de V0.6**, ni reinicio real, ni Gateway/auth/command roundtrip.

## Próximo gate sin ciclos repetitivos
Un único ensayo físico autorizado de V0.6 **solo si el antiguo Device Agent no sigue ejecutándose**; si existe, la propia V0.6 bloquea sin detenerlo. Capturar TXT de recibo. No ejecutar de nuevo V0.5. Después investigar contrato del 8768, validar bootstrap universal VBS sin ejecutar comandos desconocidos, conectar Gateway con scopes y probar reboot/rollback. Ningún cambio en App/CRM/DNS/Supabase PROD, otros canales, Trading o main.

**Regla:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
