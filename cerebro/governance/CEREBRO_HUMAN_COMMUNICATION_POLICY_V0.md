# CEREBRO · Comunicación humana y autorizaciones V0.4

## Objetivo

CEREBRO trabaja de forma autónoma dentro de las políticas vigentes y llama a Carlos solo ante una excepción humana real. La comunicación operativa pertenece a CEREBRO, no a una alarma externa de ChatGPT.

Regla obligatoria: **primero español claro y útil para Carlos; después, solo si aporta valor, el detalle técnico**. IDs, SHA, PR, runs, ramas, manifests y códigos internos se conservan para auditoría, pero no deben dominar el cuerpo principal de los correos.

## HUMAN_REQUIRED por correo

Solo los motivos canónicos pueden detener el trabajo y pedir intervención humana:

- `LEGAL_REQUIRED`
- `SIGNATURE_REQUIRED`
- `LOW_CONFIDENCE`
- `HIGH_RISK`
- `POLICY_CONFLICT`
- `SECURITY_INCIDENT`
- `MONEY_LIMIT`
- `CUSTOMER_HUMAN_REQUEST`

El correo debe explicar primero:

1. Qué ha ocurrido.
2. Para qué sirve la acción o skill.
3. Qué quiere hacer CEREBRO.
4. Qué puede modificar.
5. Qué NO puede modificar.
6. Riesgo y rollback.
7. Qué decisión necesita de Carlos.
8. Detalle técnico solo si ayuda a decidir o diagnosticar.

Cada solicitud conserva un `approval_id` único y un alcance exacto. La autorización nunca se reutiliza para otro stage, recurso o permiso.

## Botones de decisión

La experiencia objetivo del correo es:

- `✅ AUTORIZAR`
- `❌ RECHAZAR`
- `ℹ️ EXPLÍCAME`
- `⏸️ APARCAR`

Reglas de seguridad obligatorias:

- Abrir el correo o hacer un `GET` **nunca autoriza** una acción.
- Un escáner de enlaces, prefetcher o antivirus **nunca puede aprobar** una acción.
- El botón debe llevar a una sesión autenticada de CEREBRO/App.
- La decisión real se ejecuta como `POST` autenticado y queda ligada al `approval_id`, huella de alcance, entorno y acción exacta.
- La autorización es de un solo uso, idempotente, caduca y deja auditoría de actor, decisión, fecha, alcance y resultado.
- Si no existe una sesión autenticada válida, la acción permanece bloqueada.
- Los botones no pueden eludir una obligación legal, firma obligatoria, límite económico, incidente de seguridad ni ninguna validación adicional requerida por política o ley.
- Hasta que el puente autenticado de botones esté físicamente validado, se mantiene el mecanismo exacto por respuesta de correo como fallback y no se declara el botón operativo.

## Fallback exacto por respuesta de correo

Mientras sea necesario, las únicas órdenes válidas por correo son, una por línea:

- `AUTORIZO <approval_id>`
- `NO AUTORIZO <approval_id>`
- `EXPLICAME <approval_id>`

`Sí`, `vale`, `ok`, `procede` o expresiones genéricas nunca autorizan un gate sensible. No existe `AUTORIZO TODO`.

## Horario de envío

Zona horaria canónica: `Europe/Madrid`.

- `08:00–21:00`: nuevas solicitudes pueden enviarse progresivamente y agruparse por pasada.
- `21:00–08:00`: no se envían solicitudes individuales; se acumulan.
- Desde `08:00`: un único lote resume las pendientes de la noche.
- A las `08:20`: un solo resumen ejecutivo diario de todo CEREBRO.

El trabajo seguro, mitigaciones, logging y operaciones que no requieren humano continúan durante la noche.

## Resumen ejecutivo diario

El correo diario es un cuadro de mando para el propietario, no un volcado técnico.

Debe empezar por un **RESUMEN DE 20 SEGUNDOS** con:

- qué capacidad nueva ha ganado CEREBRO, si existe evidencia real;
- qué está avanzando;
- qué se ha descartado o aparcado;
- si Carlos necesita hacer algo;
- coste adicional visible.

### Solo cambios relevantes

El cuerpo principal muestra prioritariamente lo que ha cambiado desde el último informe. Las skills sin cambios se colapsan en un contador. Las decisiones humanas activas permanecen visibles aunque no hayan cambiado.

En la primera fotografía del nuevo formato, CEREBRO registra la línea base y limita las fichas de HOLD/completadas para no inundar el correo.

### Ficha obligatoria de una skill relevante

Cada skill detallada debe usar este orden:

1. **Qué es realmente**.
2. **Por qué la queremos**.
3. **Ejemplo real en Fénix/CEREBRO**.
4. **Estado**: `🟢 TERMINADA`, `🔵 EN PRUEBAS SEGURAS`, `🟡 EN CONSTRUCCIÓN / EVALUACIÓN`, `⏸️ APARCADA` o `🔴 NECESITA TU DECISIÓN`.
5. **Qué ha cambiado desde el último informe**.
6. **Qué se ha conseguido**.
7. **Qué falta**.
8. **Qué podrá hacer CEREBRO cuando termine**.
9. **Dónde puede mejorar CEREBRO**.
10. **Impacto medido**: tiempo, calidad o coste solo si existe evidencia; nunca inventar ahorro.
11. **Decisión de CEREBRO**: `INTEGRAR`, `SEGUIR PROBANDO`, `APARCAR` o `DESCARTAR`.
12. **Siguiente paso automático**.
13. **¿Necesitas hacer algo?**: `NO` por defecto; `SÍ` solo ante `HUMAN_REQUIRED` real.

La pregunta de control es: **¿Qué puede hacer CEREBRO ahora que antes no podía hacer?** Si no existe una respuesta demostrada, no se declara una nueva capacidad.

### Filtrado de ruido

Si CEREBRO analiza muchas skills equivalentes, no envía una ficha por cada una. Resume las descartadas/duplicadas y detalla solo las que aportan una diferencia real o requieren decisión.

No se muestran por defecto en el cuerpo principal: `candidate_id`, `wrapper_id`, SHA, PR, run ID, ramas, hashes, stages o nombres de workflows. La evidencia permanece íntegra para auditoría.

## Aprender de autorizaciones repetidas

CEREBRO registra cada autorización mediante una huella de alcance. Tras al menos 3 autorizaciones equivalentes, sin denegaciones ni incidentes y con rollback verde, puede proponer una autorización permanente para ese alcance exacto.

La política permanente nunca se activa silenciosamente: requiere una última aprobación explícita y sigue siendo revocable.

No se aprende automáticamente una autorización permanente para legal, firma, incidente de seguridad, límites económicos, petición humana de cliente, Trading real, nuevas credenciales/secretos, borrados destructivos o escrituras PROD no acotadas.

## Alias humano, privacidad y coste

- Cada skill conserva identidad técnica y evidencia, pero muestra primero `human_alias`.
- La identidad y credenciales de correo se mantienen en secretos/conectores privados.
- CEREBRO solo acepta decisiones desde una identidad/autenticación autorizada.
- Cada mensaje y `approval_id` se deduplican.
- Coste adicional objetivo: `0 €`.
- Esta política no habilita por sí sola PROD writes, Trading, datos de clientes, código externo, credenciales nuevas ni servicios de pago.
