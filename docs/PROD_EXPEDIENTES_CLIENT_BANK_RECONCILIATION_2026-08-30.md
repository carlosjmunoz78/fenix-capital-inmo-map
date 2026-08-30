# PROD · Reconciliación clientes y contexto bancario · 2026-08-30

## Estado

Auditoría de solo lectura sobre identidad de cliente y contexto bancario. No se ha borrado ni modificado el CRM legado. No se han creado envíos bancarios ni ofertas nuevas.

## Credencial de migración documental

El workflow de preparación #57 confirmó `NOTION_TOKEN_READY=no` en GitHub Actions. El pipeline documental está construido y validado, pero la ejecución automática de los 118 archivos no puede arrancar desde GitHub hasta que exista el secreto `NOTION_TOKEN`.

## Clientes pendientes en expedientes legado

De los 46 expedientes actuales con clave `exp-legado-*`, 9 no tienen relación `Cliente`.

Dos corresponden a registros estructurales/no operativos ya identificados:
- `⚠️ LEGADO SIN TÍTULO · 39c81b1a`
- `🆕 Nuevo expediente · LEGADO`

Los otros 7 son expedientes reales con texto de cliente presente en el CRM legado y, por tanto, requieren canonización de relación en el CRM nuevo, no invención de identidad:
- ANTONIO → cliente legado `ANTONIO`
- JONATAN, MACARENA Y JOSE ANTONIO → mismo texto cliente
- LEYDE → cliente legado `LEYDE`
- LOLA FONSECA PABLO → texto legado `LOLA FUENSECA`
- NICOLAS → cliente legado `NICOLAS`
- Paco Martín → cliente legado `Paco Martín`
- SAMRA IMRAN → texto legado `SAMRA`

### Verificación contra `Clientes · Fénix Capital`

Se ha consultado la fuente canónica actual de clientes sin escribir datos.

- No existe coincidencia exacta segura para esos siete expedientes.
- Existen candidatos parciales por nombre en algunos casos, especialmente `Antonio`, por lo que un enlace automático por texto produciría riesgo de identidad incorrecta.
- Consultas específicas por `Jonatan`, `Macarena` y `Leyde` no devolvieron candidatos en la fuente canónica actual.
- La consulta por `Lola`, `Sara`, `Samra` y `Nicolas` solo devolvió un registro que contiene `Sara`: `JESUS EGEA Y SARA`. Ese registro tiene su propio `ID legado CRM`, teléfono y expediente asociado, por lo que es una identidad distinta y NO debe reutilizarse para `LOLA FONSECA PABLO`.
- Resultado: `CLIENT_LINK_GATE = OPEN` para esos 7 casos hasta disponer de evidencia adicional inequívoca. No se ha creado ni modificado ningún cliente.

### Comprobación adicional contra `02_Contactos_PRO`

Se ha comprobado la fuente amplia de contactos del CRM legado para evitar confundir contactos B2B con clientes particulares.

- El expediente `Paco Martín` sí tiene una relación legacy en `02_Contactos_PRO`, pero el registro relacionado está clasificado como `Gerente inmobiliaria`, asociado a inmobiliaria, y su propia nota indica que fue corregido porque antes había quedado como cliente durante una migración. Por tanto, esa relación NO sirve como identidad canónica de cliente y no debe copiarse a `Cliente`.
- Para el nombre `Antonio` existen registros legacy exactos clasificados como `Gerente inmobiliaria` en distintas inmobiliarias. Esto demuestra que el nombre aislado tampoco identifica al cliente del expediente `ANTONIO`.
- Los otros expedientes pendientes no tienen relación `02_Contactos_PRO` que permita resolver de forma inequívoca la identidad en esta comprobación.

### Evidencia documental de `LOLA FONSECA PABLO`

La ficha legacy de `LOLA FONSECA PABLO` contiene 13 adjuntos reales. Entre los nombres de archivo se observan `DNI_LOLA.pdf` y `DNI_SARA.pdf`, además de documentación laboral y bancaria separada de ambas personas. Las notas internas indican que Lola y su hija Sara solicitan la hipoteca, aunque la compraventa se haría solo a nombre de Lola.

Esto mejora la evidencia de composición del expediente: hay dos personas reales diferenciadas, Lola y Sara. Sin embargo, el nombre de archivo no expone por sí mismo DNI/NIE, teléfono o email verificable; por tanto no autoriza crear o enlazar automáticamente una identidad canónica. Se preserva para la migración documental y futura verificación humana/automatizada segura.

## Contexto bancario observado en esos expedientes

El CRM legado contiene contexto bancario para varios de estos casos. Este contexto NO se transforma automáticamente en `Envíos a banco` porque una relación bancaria histórica o una lista de bancos no prueba por sí sola fecha, actor, envío documental, propuesta u oferta.

- ANTONIO: lista histórica BBVA + ING. Además, el expediente tiene dos relaciones bancarias estructuradas y se han resuelto contra `04_Bancos_PRO`: una apunta inequívocamente a `BBVA` y otra a `ING`. Esto confirma asociación estructurada del expediente con ambos bancos, pero no demuestra por sí solo que existiera un envío operativo equivalente al modelo actual.
- JONATAN, MACARENA Y JOSE ANTONIO: BBVA en lista histórica; sin relación bancaria estructurada observada en esta auditoría.
- LEYDE: BBVA + Caja Rural de Granada Rincón de la Victoria en lista histórica; sin relación bancaria estructurada observada en esta auditoría.
- LOLA FONSECA PABLO: ING + ABANCA. Las notas sí mencionan expresamente `PRE OK EN ABANCA`, lo que constituye evidencia más fuerte de interacción con ABANCA que la mera lista histórica, pero todavía no se crea un `Envío a banco` sin reconciliar el modelo y fecha/actor de la operación.
- NICOLAS: lista histórica UCI y una relación bancaria estructurada. La relación se ha resuelto contra `04_Bancos_PRO` y apunta inequívocamente a `UCI`. Confirma asociación estructurada con UCI, pero no equivale automáticamente a un envío documentado en el modelo nuevo.
- Paco Martín: sin banco histórico informado en esta consulta.
- SAMRA IMRAN: ING en lista histórica; sin relación bancaria estructurada observada en esta auditoría.

### Resultado del subgate bancario estructurado

En toda la población legacy, los únicos expedientes con `🏦 Banco (relación)` no vacío son `ANTONIO` y `NICOLAS`:
- `ANTONIO → BBVA + ING`
- `NICOLAS → UCI`

`BANK_STRUCTURED_MAPPING = CLOSED` a nivel de identificación de banco. Sigue abierto el gate de operación bancaria: no se fabricarán `Envíos a banco` ni `Ofertas` sin evidencia suficiente de que esas acciones ocurrieron y sin encajar fecha/actor/estado en el modelo actual.

## Criterio de migración

1. Mantener CRM antiguo operativo y sin borrados.
2. Resolver las 7 relaciones de cliente reales únicamente con identidad canónica inequívoca; no fusionar por simple parecido de nombre.
3. Excluir los 2 registros estructurales del gate de cliente real.
4. No reutilizar contactos B2B/gerentes como clientes aunque el nombre coincida.
5. Conservar evidencia documental de identidad sin inventar campos extraídos que aún no estén verificados.
6. Preservar contexto bancario histórico como contexto; las relaciones estructuradas identifican banco, pero no se convierten automáticamente en `Envíos`/`Ofertas` sin evidencia operativa suficiente y compatible con el modelo actual.
7. Repetir esta reconciliación dentro del corte delta final inmediatamente antes del lanzamiento.
