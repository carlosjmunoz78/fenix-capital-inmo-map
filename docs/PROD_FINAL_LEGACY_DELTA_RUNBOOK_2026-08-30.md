# PROD FINAL LEGACY DELTA RUNBOOK · 2026-08-30

Estado: preparado para ejecución inmediatamente antes del lanzamiento. No ejecutar como corte definitivo mientras queden gates externos abiertos.

## Objetivo
Capturar y aplicar únicamente los cambios reales ocurridos en el CRM legado después del baseline validado, sin borrar ni inutilizar el CRM antiguo y sin duplicar datos ya migrados.

## Baseline validado
- SHA de referencia: `028fce479e029a372fe363df6915f3124e9a0b49`.
- `01_Expedientes_PRO`: 46 expedientes.
- 31 expedientes con adjuntos históricos.
- CRM nuevo: 72 expedientes totales, 46 con `exp-legado-*`.
- 46/46 expedientes legado con `Financiero ficha` relacionado a Belén bajo la regla temporal vigente.
- 27/46 expedientes legado con `Inmobiliaria` relacionada.
- Documentación nueva: 49 registros, 47 relacionados con expediente, 0 con `Archivo tratado` poblado.
- Binarios históricos pendientes: 118 archivos en 31 expedientes.

## Secuencia de corte final
1. Leer de nuevo `01_Expedientes_PRO` y las fuentes legado relacionadas sin modificar el origen.
2. Detectar altas nuevas respecto al baseline y asignarles una `Clave deduplicación` estable siguiendo el patrón legado vigente.
3. Detectar cambios posteriores al baseline en estado/fase, relaciones, notas operativas, inmobiliaria, financiero, banco contextual, documentación, pausas, bajas y reactivaciones.
4. Releer los adjuntos legado y reconciliar el número real frente a 118. Si cambia, detener únicamente la transferencia documental y regenerar manifiesto/plan; no asumir que 118 sigue siendo válido.
5. Aplicar el delta al CRM nuevo de forma idempotente: misma clave => actualizar/reconciliar, nunca duplicar.
6. Mantener `Financiero ficha = Belén` para expedientes mientras la regla temporal siga vigente, salvo evidencia de cambio explícito.
7. No crear relaciones de cliente a partir de parecido nominal. Los casos sin identidad inequívoca permanecen abiertos para revisión.
8. No convertir `Banco (lista)` histórico en `Envíos a banco` u `Ofertas`; solo preservar relación estructurada o evidencia de envío real.
9. Verificar después de la aplicación: conteos, claves de deduplicación únicas, relaciones, estados activos/históricos, previsión de firma, documentación y ausencia de duplicados.
10. Generar manifiesto final de corte con fecha/hora, SHA candidato, conteos origen/destino y resultado de reconciliación. No versionar URLs firmadas, credenciales ni metadatos sensibles.
11. Ejecutar smoke test PROD con usuarios autorizados.
12. Abrir el CRM nuevo como primario solo con smoke verde. Mantener el CRM antiguo intacto y utilizable como respaldo durante estabilización.

## Condiciones de bloqueo real
- Credenciales PROD/runtime inexistentes o inaccesibles.
- Transferencia documental sin credencial válida o sin posibilidad de reconciliar 100% de los archivos esperados.
- Conflicto de identidad o fusión de clientes sin evidencia inequívoca.
- Cualquier acción destructiva sobre el CRM antiguo.
- CI rojo o smoke PROD rojo.

## Regla de decisión
- VERDE: proseguir al siguiente paso seguro.
- ROJO: diagnosticar, corregir y revalidar.
- El corte final no exige apagar ni borrar el CRM antiguo; el origen permanece disponible como fallback hasta que la app nueva esté estabilizada.
