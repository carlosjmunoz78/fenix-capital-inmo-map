# Auditoría documental y bancaria de expedientes legado · 2026-08-30

## Alcance
Auditoría de preparación PROD sobre los 46 expedientes legado reconciliados en `Expedientes · Fénix Capital`. No despliega PROD, no toca `main`, no borra datos y no migra binarios a ciegas.

## Financiero
Decisión operativa vigente: todos los expedientes quedan asignados a Belén de momento.

Verificación realizada tras la asignación:
- 46/46 expedientes legado tienen `Financiero ficha` informado.
- El gap de financiero queda cerrado para el lanzamiento inicial.

## Documentación histórica
Fuente legado: `01_Expedientes_PRO`.

Inventario confirmado:
- 37/46 expedientes tienen `📎 Documentación adjunta` histórica.
- Total de archivos adjuntos legacy detectados: **118**.

Fuente nueva: `Documentación · Fénix Capital`.

Estado actual comprobado:
- 49 registros documentales totales.
- 47 están relacionados con algún expediente.
- 36 están marcados `Migrado TEST`.
- **0 registros tienen actualmente `Archivo tratado` informado**.

Conclusión:
- La estructura documental nueva existe, pero los 118 binarios históricos no están todavía representados como archivos operativos en la nueva base.
- No es seguro dar por migrada la documentación solo porque existan registros documentales relacionados.
- El gate documental requiere inventario y migración controlada de los archivos históricos, manteniendo relación con expediente y sin perder el origen.
- No se deben recrear tipos de documento ni clasificaciones si el archivo legacy no aporta evidencia suficiente.

## Bancos históricos
En `01_Expedientes_PRO`:
- 28 expedientes tienen información en `🏦 Banco (lista)`.
- Solo 2 expedientes tienen relación bancaria estructurada en `🏦 Banco (relación)`.
- Los valores de lista incluyen BBVA, ING, ABANCA, Caja Rural de Granada, UNICAJA y UCI según el expediente; en varios casos hay más de un banco histórico.

Modelo nuevo:
- El expediente dispone de relación `Envíos a banco`.
- `Envíos a banco · Fénix Capital` contiene actualmente 12 registros, 12 ligados a expediente y 11 ligados a banco.

Conclusión:
- La lista antigua de bancos no debe copiarse directamente como si cada banco hubiera sido un envío real.
- Solo deben generarse `Envíos a banco` cuando exista evidencia de envío/gestión bancaria; una mera lista histórica puede representar candidatos, bancos considerados o trabajo previo.
- Los 2 expedientes con relación bancaria estructurada legacy ofrecen evidencia más fuerte, pero aun así deben conservarse como histórico o mapearse al modelo actual según el contexto del expediente.

## Gate antes de PROD
1. Mantener Belén como financiero inicial en los 46 expedientes legado.
2. Inventariar los 118 archivos legacy por expediente y preservar su identidad/origen.
3. Migrar los archivos al modelo `Documentación · Fénix Capital` solo con relación exacta al expediente y sin inventar metadatos.
4. Comprobar que el número de archivos migrados coincide con el inventario aceptado y que son accesibles desde la ficha del expediente.
5. Reconciliar bancos distinguiendo: enviado realmente, considerado/candidato y simple referencia histórica.
6. Ejecutar un corte final del CRM antiguo inmediatamente antes del lanzamiento para incorporar cambios y archivos añadidos desde esta auditoría.

## Regla de seguridad
No se borran ni se sustituyen adjuntos legacy durante la transición. El CRM antiguo seguirá siendo fuente de contraste durante el periodo de convivencia hasta que la integridad documental y bancaria quede validada.