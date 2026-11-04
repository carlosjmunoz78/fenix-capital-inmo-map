# CEREBRO OS · Cuatro canales universales independientes · Contrato arquitectónico V1

**Fecha:** 2026-11-04  
**Estado:** DEFINIDO (arquitectura), no implica implantación ni conexión real.  
**Ámbito:** Multiempresa, PREPROD, cero suscripciones nuevas, preservar completamente APP/CRM/PROD/Trading y componentes actuales.  
**Orden del propietario:** PC, móvil, tablet y extensión universal de navegadores son **productos/ejecutores distintos**, aunque todos estén coordinados por CEREBRO OS.

## 1. Cuatro canales distintos (separación obligatoria)

| ID | Canal | Identidad | Runtime independiente | Instalación / actualización / rollback | Estado técnico |
|---|---|---|---|---|---|
| PC-001 | **Control Universal del PC** | dispositivo + usuario Windows | Agent/AccessBoot + servicios locales + bandeja | Versionado propio, sin sustituir arranques heredados sin aceptación OLD vs NEW | PARCIAL: V0.2 monitor verificado; 8767 OK; 8765 arrancó y respondió tras recovery puntual, persistencia no verificada; 8766 y 8768 pendientes; Gateway OFF |
| MOB-001 | **Control Universal del Móvil** | dispositivo móvil + usuario + plataforma | App/agente móvil independiente | App móvil, permisos y rollback propios, según Android/iOS | PLANIFICADO / POR AUDITAR; no atribuir capacidades bloqueadas por plataforma |
| TAB-001 | **Control Universal de Tablet** | tablet + usuario + plataforma | App/agente para tablet separado de MOB-001 a nivel producto/operación (puede reutilizar librerías compartidas) | App tablet y pruebas específicas tablet/Android/iPadOS | PLANIFICADO / POR AUDITAR |
| BRX-001 | **Extensión Universal de Navegadores** | instancia de extensión + perfil/navegador + equipo | WebExtensions con núcleo compartido y adaptador por navegador | Instalación, permisos, actualización y rollback de extensión propios | Chrome/Browser Bridge PARCIAL, Opera **NO integrado en CEREBRO**, Edge/Firefox POR AUDITAR |

**Separación semántica:** el Browser Agent Host en Windows / puerto 8765 es infraestructura de PC-001, **no equivale** a una extensión universal BRX-001. La conexión Opera usada por el asistente ChatGPT **no es** una integración instalada o gobernada por CEREBRO.

## 2. Plano central compartido, ejecución aislada

CEREBRO Console → CEREBRO Gateway → Auth/IAM, Policy Engine, Device/Capability Registry, Event/Audit Bus → adaptadores dedicados `pc`, `mobile`, `tablet`, `browser_extension`.

- Compartir contratos, políticas, observabilidad, gobierno, herramientas base y lógica de negocio **no significa** compartir instalación, proceso crítico, credenciales ni permisos entre canales.
- Un canal puede faltar, cerrarse, pausarse, actualizarse, reiniciarse o fallar **sin detener ni degradar** los demás. Fallar cerrado en acciones de ese canal.
- Posibilidad de ejecutar tareas por varios caminos: decisión del CEREBRO Model/Capability Router basada en capacidad real declarada, disponibilidad medida, contexto, coste y permisos. Nunca declarar ONLINE a partir de una conexión de otro canal.
- La consola permite ver por separado `PC / MÓVIL / TABLET / NAVEGADORES`, con estado, historial y botón de pausa propios, además de vista conjunta.

## 3. Contrato mínimo por identidad/comando

Sobre cada acción se requiere `company_id`, `engine_id`, `environment`, `version`, `channel_id`, `device_id` o `browser_instance_id`, `request_id`, `capability`, `permission_scope`, `expires_at` y `idempotency_key`. Añadir `platform`, `user_session_id` y `profile_id` donde corresponda.

- Autorizaciones exactas por canal, dispositivo, sesión y acción; ninguna herencia implícita desde permisos de otro canal.
- Las credenciales/vault de cada canal quedan cifradas y aisladas; no copiar cookies entre navegadores ni credenciales entre dispositivos.
- Acceso a cámara, micrófono, pantalla, accesibilidad, notificaciones y archivos según permisos específicos y las restricciones del sistema operativo; sin acceso oculto ni elusión de consentimiento.
- Mantener `PROD_DENIED` y Trading REAL aislado hasta promoción gobernada. Excepciones humanas según políticas del proyecto.

## 4. Matriz mínima de aceptación independiente

Para CADA canal: instalación limpia, arranque/autoarranque donde esté soportado, pausa/reactivación, health, comando sintético seguro, scope negativo, cierre/desconexión independiente, readback, journal/TXT de estado (PC), backup, rollback, reinicio, coste 0€ medido, seguridad y ausencia de regresiones en los otros tres canales.

Para BRX-001 añadir contratos específicos de Chrome, Opera, Edge y Firefox (manifest/permisos compatibles, contenido/pestañas, perfil, navegación, CORS/host permissions). La extensión no puede depender de que el navegador de ChatGPT esté abierto.

Para MOB-001 y TAB-001 auditar primero capacidades concretas y diferencias reales Android/iOS/iPadOS; **no afirmar control total** antes de pruebas físicas y permisos admitidos.

## 5. Continuidad operativa sin romper lo existente

1. Conservar PC V0.2 con la Z azul y generación de `CEREBRO_ESTADO_ACTUAL.txt`. No crear otro supervisor.
2. Recuperar con backup físico y evidencia los servicios heredados 8765/8766/8768; 8765 solo tuvo éxito puntual en recovery, no permanencia certificada; 8767 queda intacto.
3. Conectar PC-001 con Gateway bajo exact-scope. PROHIBIDO modificar App/CRM/Supabase PROD/Trading sin proceso de promoción.
4. Auditar la extensión Chrome real y documentar su interfaz; crear adaptador Opera separado sin asumir que el asistente es CEREBRO.
5. Mantener MOB-001 y TAB-001 como motores/agentes separados, con pruebas y release independientes, reutilizando únicamente contratos/librerías seguros.
6. Actualizar Registry, dependencias, tests, runbook, changelog, backups, rollback, rebuild y estado de autonomía después de cada avance.

**Regla:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.  
**Resultado esperado:** cuatro ejecutores verdaderamente independientes, un CEREBRO director, sin cuatro sistemas monolíticos ni duplicación artificial de runtime.
