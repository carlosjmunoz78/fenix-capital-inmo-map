# PROD · Reconciliación clientes y contexto bancario · 2026-08-30

## Estado

Auditoría de solo lectura. No se ha borrado ni modificado el CRM legado. No se han creado envíos bancarios ni ofertas nuevas.

## Credencial de migración documental

El workflow de preparación #57 ha confirmado `NOTION_TOKEN_READY=no` en GitHub Actions. El pipeline documental está construido y validado, pero la ejecución automática de los 118 archivos no puede arrancar desde GitHub hasta que exista el secreto `NOTION_TOKEN`.

## Clientes pendientes en expedientes legado

De los 46 expedientes actuales con clave `exp-legado-*`, 9 no tienen relación `Cliente`.

Dos corresponden a registros estructurales/no operativos ya identificados:
- `⚠️ LEGADO SIN TÍTULO · 39c81b1a`
- `🆕 Nuevo expediente · LEGADO`

Los otros 7 son expedientes reales con texto de cliente presente en el CRM legado y, por tanto, requieren canonización de relación en el CRM nuevo, no invención de identidad:
- ANTONIO → cliente legado `ANTONIO`
- JONATAN, MACARENA Y JOSE ANTONIO → mismo texto cliente
- LEYDE → cliente legado `LEYDE`
- LOLA FONSECA PABLO → texto legado `LOLA FUENSECA` (discrepancia ortográfica; revisar antes de vincular)
- NICOLAS → cliente legado `NICOLAS`
- Paco Martín → cliente legado `Paco Martín`
- SAMRA IMRAN → texto legado `SAMRA`

### Verificación contra `Clientes · Fénix Capital`

Se ha consultado la fuente canónica actual de clientes sin escribir datos.

- No existe coincidencia exacta de título para ninguno de esos siete textos legacy.
- Existen candidatos parciales por nombre, por ejemplo más de un `Antonio`, por lo que un enlace automático por texto produciría riesgo de identidad incorrecta.
- La discrepancia `LOLA FONSECA PABLO` ↔ `LOLA FUENSECA` confirma que tampoco debe usarse una regla de similitud como sustituto de identidad.
- Resultado: `CLIENT_LINK_GATE = OPEN` para esos 7 casos hasta disponer de evidencia adicional (teléfono, email, DNI/NIE u otra relación inequívoca). No se ha creado ni modificado ningún cliente.

## Contexto bancario observado en esos expedientes

El CRM legado contiene contexto bancario para varios de estos casos. Este contexto NO se transforma automáticamente en `Envíos a banco` porque la lista histórica no prueba por sí sola que hubiese un envío real.

- ANTONIO: BBVA + ING; además 2 relaciones bancarias estructuradas.
- JONATAN, MACARENA Y JOSE ANTONIO: BBVA.
- LEYDE: BBVA + Caja Rural de Granada Rincón de la Victoria.
- LOLA FONSECA PABLO: ING + ABANCA.
- NICOLAS: UCI; además 1 relación bancaria estructurada.
- Paco Martín: sin banco histórico informado en esta consulta.
- SAMRA IMRAN: ING.

## Criterio de migración

1. Mantener CRM antiguo operativo y sin borrados.
2. Resolver las 7 relaciones de cliente reales únicamente con identidad canónica inequívoca; no fusionar por simple parecido de nombre.
3. Excluir los 2 registros estructurales del gate de cliente real.
4. Preservar contexto bancario histórico como contexto; crear `Envíos`/`Ofertas` solo si existe evidencia de operación real.
5. Repetir esta reconciliación dentro del corte delta final inmediatamente antes del lanzamiento.
