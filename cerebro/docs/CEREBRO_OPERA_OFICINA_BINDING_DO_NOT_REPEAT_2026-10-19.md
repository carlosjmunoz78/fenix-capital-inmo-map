# CEREBRO · OPERA OFICINA BINDING · DO NOT REPEAT

Estado: **HECHO / PHYSICAL_BINDING_RECORDED**  
Entorno: **PREPROD**  
PROD: **DENEGADO**

## Binding canónico

En el PC de oficina (`desktop-4c008d88919f`) existen dos instancias de Opera y **no son intercambiables**.

La instancia autorizada para evidencia física local del PC es **Opera oficina**.

Firma física/operativa verificada:

- cuando está en reposo puede mostrar una sola pestaña normal `Acceso rápido` (`opera://startpageshared/`);
- en la verificación del 19-10-2026 esa pestaña apareció como `tab_id=1126889980`;
- desde esa misma instancia se abrió y validó `http://127.0.0.1:8767/health`;
- la respuesta fue `CEREBRO Device Evidence Host`, `status=OK`, `version=0.2.4`, `prod_allowed=false`, `sanitized=true`;
- después se restauró la pestaña normal de inicio.

La otra instancia de Opera fue observada con múltiples pestañas de STAGING/WordPress y **NO debe usarse como evidencia del PC oficina** salvo una nueva verificación física explícita.

## Regla obligatoria

Antes de cualquier acción física que dependa del navegador del PC:

1. seleccionar `Opera oficina` por su binding registrado;
2. si el estado observado contradice la firma esperada, **no actuar**;
3. reidentificar primero;
4. nunca deducir que un Opera es el de oficina solo porque contiene pestañas de Fénix/STAGING;
5. nunca mezclar receipts/evidencia entre ambas instancias.

## DO NOT REPEAT

- No volver a confundir los dos Opera.
- No usar el Opera con múltiples pestañas STAGING como `Opera oficina` por inferencia.
- No rehacer Browser Universal por una confusión de instancia.
- No invalidar evidencia física de `8765/8766/8767` por leerla desde el Opera equivocado.
- No cambiar este binding sin verificación física nueva.

## Estado Device relacionado

En `Opera oficina` se verificó `8767/health` GREEN para Evidence Host v0.2.4. El receipt saneado disponible por `8767/evidence` mantiene Browser `8765` GREEN, Device `8766` GREEN, identidad canónica `desktop-4c008d88919f`, alias histórico conservado y `prod_allowed=false`.

La prueba `CEREBRO DEVICE PHYSICAL ACCEPTANCE V0.2` **no dejó receipt** (`physical_acceptance.present=false`) y por tanto no se considera válida ni definitiva. No repetirla a ciegas; corregir la causa y consolidar la siguiente aceptación dentro del AccessBoot único.
