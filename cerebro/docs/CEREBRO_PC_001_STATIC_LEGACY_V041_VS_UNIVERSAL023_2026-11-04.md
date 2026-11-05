# CEREBRO PC-001 · V0.4.1 frente a Universal 0.2.3 · Análisis estático

**Fecha:** 2026-11-04 · **Estado:** verificación estática HECHA; ejecutable Universal 0.2.3 aún sin inspeccionar; recuperación física PENDIENTE. **Coste: 0 €.**

## Archivos entregados por propietario
- `CEREBRO-Device-Agent(1).exe` y manifiesto homónimo .sha256.json.
- SHA-256 computado del PE: `0b8159b8211b2417a0cb8e8d9a3f94c2cf43fcecbd4b70f2328afdbeb7165b07`; coincide exactamente con manifiesto versión `0.4.1` y el inventario físico del agente legado.
- Formato PE32+ Win64, empaquetado **PyInstaller one-file** con **Python 3.13**.
- El archivo es la misma versión binaria ya conocida; **NO es evidencia de que corresponda al destino Universal 0.2.3 del VBS**.

## Evidencia técnica extraída sin ejecutar el PE
Mediante lectura estática del CArchive de PyInstaller (cookie MEI, TOC y zlib) y análisis del bytecode Python 3.13:
- Entrada `cerebro_device_bootstrap`. `main` reconoce `--agent`. Esta rama invoca `run_embedded_agent`; la ruta sin `--agent` invoca `install_files` y posteriormente instalación/autoarranque.
- `install_files` llama a `shutil.copy2` sobre el propio EXE y ficheros embebidos; además puede eliminar/recrear la carpeta `browser_bridge`. No debe repetirse sobre un equipo con procesos vivos.
- El literal **"Error al instalar CEREBRO"** pertenece a `safe_main`, capturador genérico de excepciones. **El título no acredita que se haya entrado en `install_files`; también puede mostrarse cuando falla la rama `--agent`.** Corregida la hipótesis anterior que atribuía el título exclusivamente a una reinstalación.
- `cerebro_local_agent_server.py` define `PORT = int(os.environ.get("CEREBRO_AGENT_PORT", "8765"))`, y abre `ThreadingHTTPServer` en ese puerto.
- Código local de recuperación **V0.6** `src/main_windows.go`: `cmd := exec.Command(it.exe, it.args...)` con `--agent`, sin `cmd.Env` ni inyección `CEREBRO_AGENT_PORT=8766`. Por tanto **hay un defecto de configuración demostrado**: intenta usar el puerto predeterminado **8765** en vez del esperado 8766, salvo que el proceso V0.6 hubiese heredado una variable de entorno que no está acreditada. El Browser 8765 estaba activo; es una causa probable de colisión, pero el error nativo exacto no se ha capturado.
- VBS original Universal V0.2.3 hash `c8639a...`, aportado mediante localizador físico: **sí establece** `CEREBRO_AGENT_PORT=8766` y apunta al EXE de `DeviceAgentUniversal/0.2.3`. Este ejecutable requiere análisis independiente; las versiones 0.4.1/0.2.3 corresponden a ramas/productos diferentes, no comparar por el número sin contrato.

## Decisión de contención
- No volver a iniciar V0.4.1 por V0.5/V0.6 ni intentar arreglarlo copiando, renombrando o matando procesos.
- Conservar 8765/8767, Monitor V0.2 y configuraciones existentes; 8766/8768 siguen offline, Gateway OFF, PROD/Trading REAL OFF.
- **Próximo paso único:** auditoría estática del EXE instalado Universal 0.2.3, SIN EJECUTARLO. Se ha construido recolector de solo lectura Windows `CEREBRO_PC_UNIVERSAL023_SOLO_LECTURA_V0_1.exe` (SHA-256 `9c1a4bc90cefcc9391296172459f2e54c85a80fb8cb4cce829dfeb7048b5a6c7`). Genera TXT de resultados y, si verifica VBS original y destino PE bajo LocalAppData/CEREBRO, ZIP con **solo una copia del EXE**. No envía datos por red, no ejecuta comandos ni guarda estado, tokens o perfiles. Compilado Windows GUI y `go test` + `go vet` PASS; **resultado físico PENDIENTE**.
- Tras analizar Universal 0.2.3: valorar rescate 8766; 8768 requiere contrato de argumento real; Gateway autenticado, reboot y rollback físicos pendientes.

**Regla:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
