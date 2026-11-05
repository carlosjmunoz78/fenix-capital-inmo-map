# CEREBRO OS · PC-001 · Objetivo real: control integral del ordenador Windows

**Propietario / mandato:** instrucción explícita del 04-11-2026. **Estado actual:** REQUISITOS DEFINIDOS, la mayoría **NO IMPLEMENTADOS NI VERIFICADOS FÍSICAMENTE**.
**Prioridad:** primero reparar el arranque y la conectividad 4/4; después control integral PC; posteriormente app de voz/comunicación multidispositivo. No confundir arranque/suspensión con control completo. **Coste:** cero nuevas suscripciones salvo autorización explícita y ROI; App/CRM/Supabase PROD intactos.

## ALCANCE FUNCIONAL DEL CONTROL TOTAL

Una vez autenticado, autorizado y con sesión de usuario válida, CEREBRO debe poder **utilizar el PC como lo haría el propietario**. El motor lógico es `PC-001`, ejecutado sobre runtime/worker compartido; evitar crear cuatro agentes o 150 servidores para funciones relacionadas:

1. **Pantalla, sesiones y ventanas:** enumeración de pantallas, resolución/zoom, captura con controles de privacidad, abrir/cerrar/cambiar ventanas y aplicaciones, foco, portapapeles y flujo interactivo visible al usuario.
2. **Ratón y teclado:** mover, pulsar, arrastrar, desplazar, escribir, atajos, seleccionar/copiar/pegar; permitir interrupción manual inmediata, kill switch y bloqueo de pantalla/secure desktop del sistema.
3. **Navegador:** usar Opera/Chrome existentes (Bridge si disponible) para pestañas, URLs, navegación, formularios, inicios de sesión mediante flujo humano cuando haga falta, carga/descarga, búsqueda, gestión de sesiones con permisos. Sin extraer contraseñas ni tokens al chat.
4. **Archivos y carpetas:** consultar, localizar, crear, copiar, mover, renombrar, organizar, comprimir, descomprimir, descargar, subir y eliminar, con política de alcance, papelera/copia previa y rollback en acciones destructivas. No borrar archivos del sistema, identidades, vaults, backups o datos críticos por defecto.
5. **Programas:** descargar desde fuentes fiables, verificar editor, firma y SHA-256 cuando corresponda; instalar, iniciar, configurar, actualizar, reparar y desinstalar, con UAC y aceptación humana para elevación, licencias, cambios de seguridad o pago.
6. **Integración y trabajo real:** leer/editar documentos, gestionar ventanas de apps existentes, usar herramientas empresariales autorizadas, transferir ficheros entre dispositivos propios, ejecución de flujos multietapa con colas e idempotencia. Shell/API local sólo con contratos de comandos, permisos y auditoría; no shell libre por defecto desde Internet.
7. **Periféricos:** audio, micrófono, cámaras, impresoras, dispositivos de almacenamiento, portapapeles y red local cuando exista soporte físico y consentimiento apropiado.
8. **Vida del dispositivo:** comprobar servicios, arrancar/apagar/reiniciar/suspender, recuperación y futura llamada a relé WOL cuando se pruebe; **solo una capacidad auxiliar** del conjunto.
9. **Multi-PC:** el instalador único `AccessBoot` descubre hardware, registra `canonical_device_id`, aplica exact-scope `company_id/engine_id/environment/version/device_id`, crea backup/snapshot, prueba OLD vs NEW, habilita coexistencia y retira heredados por fases; soporte para equipos poco potentes y 480 segundos de estabilización.
10. **Visibilidad y control:** consola CEREBRO y futuro cliente móvil/tablet muestran equipo, estado real, pantalla/acciones, historial, auditoría, permisos, órdenes en curso, interrupción humana inmediata y resultados verificados.

## Arquitectura sin romper lo existente

- **CEREBRO Gateway** valida propietario, compañía, dispositivo, contexto, acción, riesgo, caducidad, nonce, idempotencia y política. No pasar comandos de alto privilegio desde el móvil directamente al equipo.
- **PC-001 Capability Broker** integrado en AccessBoot/host existente: políticas por capacidad; ejecución de efectos por adaptadores específicos (Windows UI Automation + SendInput bajo sesión interactiva, Browser Bridge para web, Win32/PowerShell/FS para archivos, instaladores firmados).
- **Permissions:** niveles READ_ONLY, USER_SESSION_ACTION, REVERSIBLE_WRITE, ELEVATED_OR_DESTRUCTIVE; deny por defecto hasta políticas y aceptación. HUMAN_REQUIRED únicamente para motivos canónicos (legal, firma, baja confianza, riesgo alto, conflicto, incidente, límite económico, solicitud explícita).
- **Seguridad:** no acceso persistente oculto, no desactivar antivirus/UAC/firewall, no elevar ni extraer secretos automáticamente, no acceso Trading REAL, no capturar pantalla/cámara/micrófono sin señal/consentimiento conforme a configuración. Kill switch visible, registro auditable, caducidad, revocación y aislamiento multicompañía.
- **Coste/rendimiento:** preferir operaciones deterministas, tecnología del PC/Browser existente y libre; ejecución diferida con cuotas para ordenadores de escasos recursos y 480 s de warmup configurable. Los servicios 8765-8768 no se sustituyen antes de contratos, tests, backups y rollback.
- **Llamadas por voz:** proyecto posterior `VOICE-001/VOICEUI-001/COM-001` mediante aplicación móvil/tablet/PC. VOZ NO se considera requisito para cerrar el núcleo de control integral PC-001, pero se deja prevista la interfaz de eventos/acciones.

## GATES HONESTOS (2026-11-04)

- HECHO: identidad PC-001, 4/4 alcanzado tras reparación secuencial, orden remota autenticada `SERVICE_HEALTH/READ_HEALTH` E2E física, Gateway reconectado al menos una vez, limpieza selectiva backed up DPAPI.
- PARCIAL: continuidad/autostart; después de reinicio cayeron 8765, 8766, 8768. Reparador manual recupera 4/4; supervisión autónoma tras reinicio **NO ACEPTADA**.
- BLOQUEADO: cambio de 180 a 480 segundos V2 devolvió `HOLD_FAIL_CLOSED` en `ATOMIC_UPDATE`: hash real sigue antiguo; no declarar nuevo tiempo activo.
- CANDIDATO: parche de reemplazo V3 con Windows MoveFileExW, reutilización de backup previo y reporte saneado: 51 checks estáticos PASS; Windows real PENDIENTE.
- NO HECHO: control real remoto de ratón, teclado, navegador general, archivos, instalación/desinstalación, segundo PC y autónoma completa; requieren implementación + E2E independiente y rollback.
- HOLD: despertar remoto real WOL sin relay operativo y autorizado.

## SECUENCIA DE CIERRE

**A.** Aplicar con comprobación el parche de 480s y recuperar autoarranque 4/4+Gateway sin reparador manual tras reinicio; si falla, diagnosticar error concreto y corregir lógica o permisos, nunca seguir sumando tiempos arbitrariamente.

**B.** Capturar y auditar AccessBoot/Browser Bridge/Controller existentes, contrato por capacidad; implementar en paralelo el **primer bucle interactivo remoto visible**: ver pantalla → mover ratón/click → teclear → abrir navegador → descargar archivo sintético → crear/mover/borrar en carpeta de ensayo → comprobar y restaurar.

**C.** Ampliar a apps, archivos reales, periféricos, UAC y distintas sesiones con autorización y auditoría, tests de permisos/replay/revocación y rollback.

**D.** Empaquetar con AccessBoot en un único EXE universal, instalación en segundo Windows autorizado, comparación OLD vs NEW, reboot físico, backup/rebuild/rollback, tribunal y observabilidad. Solo entonces marcar FULL_CONTROL operativo por capacidad.

**E.** Después crear app multiplataforma de comunicación y llamadas CEREBRO↔propietario, reutilizando identidad/Gateway/VOICE-001.
