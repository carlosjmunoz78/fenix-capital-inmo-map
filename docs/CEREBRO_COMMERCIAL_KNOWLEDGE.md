# CEREBRO · Conocimiento comercial maestro · Fénix Capital

Vigente desde 2026-08-29. Estas reglas son conocimiento transversal para CEREBRO, Ana, APP y tipificación económica. No sustituyen los datos canónicos de cada operación.

## Regla transversal de honorarios
- La APP debe proponer automáticamente el importe que corresponda según el tarifario vigente y los datos canónicos de la operación.
- Ese importe es el **valor por defecto/recomendado**, no un bloqueo rígido.
- Dirección puede sustituirlo por un **honorario final negociado** distinto cuando exista un acuerdo concreto con el cliente.
- El honorario final negociado prevalece en previsión económica, firmado/devengado, cobrado e histórico mientras siga siendo el dato canónico de la operación.
- La APP debe conservar visible la referencia del importe recomendado que originó la propuesta, para distinguir siempre **tarifa estándar** de **importe acordado**.
- La misma lógica aplica a comisiones a inmobiliaria: se propone el importe por defecto, pero puede existir un importe acordado distinto por operación.
- Todo cambio debe quedar conectado al dato canónico de la operación y ser consumible por CEREBRO/Ana; no debe existir una cifra paralela solo visual.

## Hipotecas
- Importe hipotecario inferior a 180.000 €: 3.500 € + IVA.
- Desde 180.000 € inclusive: 2 % + IVA sobre el importe hipotecario.
- Si la hipoteca procede de una inmobiliaria, la comisión a descontar tiene un valor **por defecto de 1.100 € base**, pero debe poder modificarse por operación cuando exista un acuerdo/importe canónico distinto.
- Ejemplo: hipoteca de tramo 3.500 € procedente de inmobiliaria, sin override: facturación base 3.500 €, comisión inmobiliaria 1.100 €, margen Fénix base 2.400 €.
- Si la hipoteca es de origen directo/particular, la comisión de inmobiliaria es 0 €.
- El IVA se registra y presenta separado: no forma parte del margen Fénix.

## Obra nueva
- 800 € + IVA por defecto.
- Puede existir un honorario final negociado distinto por operación.

## Herencias
- 1 o 2 herederos directos: 600 € + IVA.
- Más de 2 herederos directos: 800 € + IVA.
- Cuando además intervienen herederos indirectos: 1.000 € + IVA.
- Expedientes con muchos herederos directos e indirectos: 1.200 € + IVA.
- La categoría determina el importe por defecto; puede existir un honorario final negociado distinto por operación.

## Economía · ciclo de previsión
- La previsión económica nace desde el alta de la operación, no desde FEIN ni desde la firma.
- La cartera prevista activa suma únicamente operaciones activas tipificadas.
- Si una operación cae, se cancela, se anula o se pierde, deja inmediatamente de sumar en cartera prevista activa y pasa a **potencial perdido**, conservando el histórico.
- Separar siempre: **cartera prevista activa**, **previsión avanzada**, **firmado/devengado**, **cobrado** y **potencial perdido**.
- Separar siempre **facturación bruta base**, **comisión de inmobiliaria** cuando proceda y **margen Fénix base**. El IVA queda aparte.
- Una firma no implica que el expediente esté cobrado. Cobrado solo se muestra cuando exista señal canónica de cobro.
- Antes de firma, si cambia el importe hipotecario y no hay honorario negociado, la previsión se recalcula con el nuevo importe canónico.
- Si ya existe un honorario negociado canónico, ese importe prevalece también antes de firma.
- Tras firma, el honorario final canónico se conserva para el histórico.
- Los casos DEMO/PRE-PROD no deben contaminar agregados económicos.
- Estos agregados económicos globales se muestran solo dentro del módulo Economía y respetan RBAC de Dirección.

## Regla de seguridad
La APP y Economía pueden tipificar una operación solo cuando existan datos canónicos suficientes para aplicar una categoría sin ambigüedad. En especial, “muchos herederos directos e indirectos” es una categoría cualitativa y no se convierte en un umbral numérico inventado. Si falta clasificación suficiente y tampoco existe un honorario final negociado canónico, el honorario debe permanecer sin calcular.

La fuente ejecutable equivalente está en `src/fenixCommercialKnowledge.ts` y la agregación operativa en `src/economyProjection.ts`.
