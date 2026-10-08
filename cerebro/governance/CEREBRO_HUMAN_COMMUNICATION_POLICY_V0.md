# CEREBRO · Comunicación humana y autorizaciones V0.2

## Objetivo

CEREBRO trabaja de forma autónoma dentro de las políticas vigentes y llama a Carlos solo ante una excepción humana real. La comunicación operativa pertenece a CEREBRO, no a una alarma externa de ChatGPT.

## HUMAN_REQUIRED por correo

Todo `HUMAN_REQUIRED` canónico debe generar una solicitud de autorización trazable. El correo debe usar siempre primero el alias humano y explicar antes de cualquier detalle técnico:

1. `Te necesito.`
2. `En palabras normales`: qué ha ocurrido y por qué se ha detenido.
3. `Para qué sirve`: qué hace el skill/motor.
4. `Qué quiere hacer ahora`.
5. `Qué puede modificar`.
6. `Qué NO puede modificar`.
7. `Riesgo y rollback`.
8. Las frases exactas que Carlos puede copiar.
9. Detalle técnico solo si aporta valor.

Cada solicitud tiene un `approval_id` único. Las únicas órdenes válidas por correo son, una por línea:

- `AUTORIZO <approval_id>`
- `NO AUTORIZO <approval_id>`
- `EXPLICAME <approval_id>`

`Sí`, `vale`, `ok`, `procede` o expresiones genéricas nunca autorizan un gate sensible. Una autorización solo desbloquea el caso y alcance exactos vinculados a su `approval_id`.

## Varias autorizaciones en un mismo correo

Una respuesta puede contener varias líneas y CEREBRO debe procesarlas por separado. Ejemplo:

```text
AUTORIZO APR-20261008-1234ABCD
AUTORIZO APR-20261008-5678EF90
NO AUTORIZO APR-20261008-A1B2C3D4
EXPLICAME APR-20261008-E5F6A7B8
```

No existe un `AUTORIZO TODO` genérico para saltar controles.

## Horario de envío

Zona horaria canónica: `Europe/Madrid`.

- De `08:00` a `21:00`: CEREBRO puede enviar las solicitudes nuevas progresivamente, agrupando las que coincidan en la misma pasada.
- De `21:00` a `08:00`: CEREBRO no envía solicitudes individuales; las acumula.
- A partir de `08:00`: envía un único lote con todo lo pendiente de la noche.

El procesamiento interno, mitigaciones seguras, logging y trabajo que no requiera al humano continúan durante la noche.

## Resumen diario único de TODO CEREBRO

Cada día, a las `08:20` hora de Madrid, debe enviarse un solo correo `CEREBRO · NOVEDADES DEL DÍA · <fecha>` con el estado y los avances de todo CEREBRO, no solo de skills.

Debe incluir, cuando aplique: publicaciones/cambios, fallos e incidencias, SEO y web, App y CRM, automatizaciones e integraciones, skills y motores, Training/aprendizaje, HOLDs, HUMAN_REQUIRED, coste adicional y siguiente trabajo seguro.

Si una zona todavía no emite telemetría suficiente, el correo debe decirlo expresamente. Nunca se inventa un estado.

## Aprender de autorizaciones repetidas

CEREBRO registra el patrón de cada autorización mediante una huella de alcance. Tras al menos 3 autorizaciones equivalentes, sin denegaciones ni incidentes y con rollback verde, puede proponer una autorización permanente para ese alcance exacto.

No amplía permisos silenciosamente. La activación de una nueva política permanente requiere una última orden explícita de Carlos. Una vez activada, CEREBRO deja de pedir permiso para acciones que permanezcan exactamente dentro de ese alcance.

No se aprende automáticamente una autorización permanente para legal, firma, incidente de seguridad, límites económicos, petición humana de cliente, Trading real, nuevas credenciales/secretos, borrados destructivos o escrituras PROD no acotadas.

## Alias humano obligatorio

Cada skill conserva `candidate_id`, `wrapper_id`, nombre técnico, versión y evidencia, pero debe tener también `human_alias`. El alias humano se muestra primero; el nombre técnico queda como referencia secundaria.

## Privacidad, identidad y coste

- La dirección real de Carlos y las credenciales de correo solo existen en secretos/conectores privados.
- CEREBRO solo acepta autorizaciones desde la identidad privada del propietario configurada.
- Cada mensaje y `approval_id` se deduplican.
- Coste adicional objetivo: `0 €`.
- Esta política no habilita por sí misma PROD writes, Trading, datos de clientes, código externo, credenciales nuevas ni servicios de pago.
