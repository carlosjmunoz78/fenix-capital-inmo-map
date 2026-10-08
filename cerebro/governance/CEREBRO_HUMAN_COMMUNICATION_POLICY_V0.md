# CEREBRO · Comunicación humana y alias de skills V0

## Objetivo

CEREBRO debe poder trabajar de forma autónoma en la zona segura y llamar al humano únicamente cuando exista una excepción canónica. Cuando necesite a Carlos, la llamada no puede quedar escondida en logs, GitHub o un estado técnico: debe generar un aviso por correo.

## Regla de correo HUMAN_REQUIRED

Todo `HUMAN_REQUIRED` canónico debe producir un correo al propietario de CEREBRO usando una referencia privada al destinatario, nunca una dirección personal guardada en este repositorio público.

Formato obligatorio:

1. Asunto: `CEREBRO · TE NECESITO · <alias humano> · <motivo>`.
2. Primera línea: `Te necesito.`
3. `En palabras normales`: qué ha ocurrido, por qué CEREBRO se ha detenido y qué decisión o acción necesita.
4. `Detalle técnico`: solo cuando aporte valor; puede incluir ID técnico, stage, run, branch, evidencia, permisos y riesgo.
5. Marcador de deduplicación para impedir correos repetidos por el mismo evento.

El correo informa; nunca autoriza por sí solo la acción bloqueada.

## Resumen diario

Una vez al día debe enviarse un correo de novedades de CEREBRO. Debe explicar primero en lenguaje normal:

- skills o motores nuevos y para qué sirven;
- avances y cambios de fase;
- mejoras relevantes;
- elementos en HOLD;
- excepciones humanas pendientes;
- coste adicional del día;
- siguiente trabajo seguro.

Si no ha habido cambios relevantes, el correo debe indicar expresamente que no hubo novedades significativas y resumir el estado general.

## Alias humano obligatorio

Cada skill conserva siempre su identidad técnica (`candidate_id`, `wrapper_id`, nombre técnico, versión y evidencia), pero además debe tener `human_alias`.

Reglas:

- el alias humano se muestra primero en interfaces y comunicaciones dirigidas a personas;
- debe ser corto, comprensible y preferentemente en español;
- no sustituye ni modifica el ID técnico;
- puede existir un alias explícito en el registro canónico;
- si todavía no existe, CEREBRO genera un alias legible de forma determinista hasta que haya uno mejor;
- ningún cambio de alias altera trazabilidad, permisos, rollback ni contratos del skill.

## Privacidad y coste

- La dirección de correo real se resuelve desde un conector o secreto privado.
- No se guarda PII personal en el repositorio público.
- Coste adicional objetivo: `0 €`.
- No se habilitan PROD writes, auto-merge, customer data, Trading, ejecución de código externo ni paid fallback por esta política.
