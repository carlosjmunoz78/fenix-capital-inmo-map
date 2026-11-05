# CEREBRO OS · Autorizaciones que aprenden · V0 (2026-11-05)

## Comportamiento solicitado por el propietario
Ante un `HUMAN_REQUIRED` real, CEREBRO ofrecerá cuatro respuestas comprensibles:

1. **Solo esta vez:** permiso limitado a una única acción específica.
2. **Todos los casos similares:** registrar una autorización reutilizable para el mismo `company_id`, `engine_id`, entorno, versión, capacidad, acción, recurso, finalidad, clase de datos, efectos, política, nivel de riesgo y coste.
3. **Excepción sin precedente:** permitir resolver únicamente el caso puntual sin crear una regla futura.
4. **No autorizar:** rechazar y detener la operación.

La finalidad es **dejar de repetir preguntas ordinarias**. Una aprobación para Fénix no autoriza otra empresa; una publicación en borrador no autoriza enviar mensajes; una lectura no autoriza borrar ni modificar; un permiso de un entorno no se aplica a otro.

## Qué código se incluye
- `cerebro/governance/owner-standing-consent-v0.mjs`: funciones puras de normalización, creación candidata después de **verificación independiente** del evento del propietario, coincidencia estricta de casos, y preparación de revocación.
- `cerebro/tests/owner-standing-consent-v0.test.mjs`: 40 pruebas de alcance, identidad, caducidad, fallo cerrado, revocación y distinción entre supresión de consultas y autorización de ejecución.
- `cerebro/contracts/console-owner-decision-v1-standing-consent-addon.json`: extensión aditiva, sin sustituir el contrato V1.

## Límites intencionados
**Estos componentes NO crean permisos vivos ni ejecutan acciones.** El código devuelve una coincidencia que evita tener que volver a **preguntar** si el backend seguro lo autoriza. Cada acción posterior debe pasar nuevamente POL-001, el ejecutor real, los límites y la auditoría. Las claves nunca se guardan en las reglas. La verificación de identidad y firma del propietario es responsabilidad de un servicio backend confiable, no del modelo. El ledger persistente debe consumir permisos `ONE_SHOT`/`CASE_EXCEPTION` de forma atómica: el Map local no sirve como ledger de producción.

`ALL_SIMILAR` se limita inicialmente a PREPROD, riesgo LOW, coste 0, acciones de lectura/borradores/ensayo; caduca como máximo a 365 días. Una posible autorización reutilizable futura para otra clase de riesgo no puede inferirse de este V0; requiere un control propio y evidencia de seguridad. Ningún permiso puede suprimir por sí solo una obligación legal, firma personal, incidente de seguridad o petición de humano. El propietario puede revocar cualquier concesión y el cambio de política o alcance invalida su reutilización.

## Gates pendientes
- Vincular la UI de CEREBRO Console para registrar elección y contexto literal.
- Identificación del propietario/autenticación fuerte en backend, firma de decisión, caducidad e idempotencia.
- Almacenamiento cifrado/seguro de metadatos de concesión y ledger atómico de usos, sin secretos.
- Consulta exacta desde POL/HEX + Gateway/dispatcher por cada acción.
- Test E2E PREPROD: primera autorización y segunda similar sin pregunta, diferente con pregunta, excepción sin precedente, revocación en caliente y `HUMAN_REQUIRED` obligatorio.
- PREPROD, OLD vs NEW, observabilidad, backup, rollback y promoción gradual antes de permitir operaciones reales.

No se modifica el Gateway de PC-001, los cuatro servicios Windows existentes, App, CRM, Supabase, WordPress, Training ni Trading. No se compra API ni suscripción.