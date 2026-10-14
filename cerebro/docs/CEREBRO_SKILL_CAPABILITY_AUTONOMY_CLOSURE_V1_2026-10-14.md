# CEREBRO OS · Skill Capability Autonomy Closure V1

Fecha: 2026-10-14
Estado objetivo: PREPROD gobernado, multiempresa, 0 € adicionales, sin autoridad PROD ni Trading.

## Motivo

La supply chain de skills ya dispone de discovery, evidencia de licencia/procedencia, pre-LAB, wrappers deshabilitados, OLD vs NEW, aprendizaje LRN-001, tribunal, rollback/rebuild y AutoLoop. El hueco transversal restante es una decisión canónica única que evite rediseñar la fábrica o convertir cada skill en un motor nuevo.

Este cierre añade una política determinista sobre la evidencia existente. No sustituye FACT-001, LRN-001, el tribunal, el Skill AutoLoop ni el Skill Capability Evolution V0.

## Decisiones canónicas

Solo se permiten:

- `REUTILIZAR`: la capacidad ya existe y no requiere mutación.
- `ENVOLVER`: extender un motor existente antes de fabricar otro. Solo puede autorizar activación de wrapper interno en PREPROD cuando el wrapper está internalizado, OLD vs NEW y tribunal están GREEN, políticas/permisos están bloqueados y rollback/rebuild están listos. Nunca ejecuta código externo de la skill.
- `CATALOGAR`: capacidad útil sin demanda operativa actual; se conserva como evidencia sin activar.
- `FABRICAR_GRATIS`: gap verificado y ruta de coste 0 €. Solo autoriza candidato para FACT-001; no autoriza creación directa de motor.
- `HOLD`: falta evidencia, confianza, política, permisos, rollback/rebuild o existe una excepción humana canónica.
- `DESCARTAR`: procedencia/supply-chain no confiable, licencia incompatible, regresión OLD vs NEW/tribunal, alternativa gratuita razonable frente a opción de pago o falta de ROI.
- `PAGO_JUSTIFICADO`: no existe alternativa gratuita razonable y hay evidencia positiva de ROI. Nunca autoriza pago o activación por sí mismo; si supera el límite económico usa `MONEY_LIMIT`.

## HUMAN_REQUIRED

No se crean motivos nuevos. Solo son válidos:

`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

Un HOLD técnico por evidencia ausente no fuerza intervención humana si CEREBRO puede seguir obteniendo evidencia de forma segura.

## Orden de decisión

1. Seguridad/procedencia/supply-chain/licencia.
2. Excepciones legales, de política y riesgo.
3. Evidencia y confianza.
4. Bloqueo de políticas/permisos y disponibilidad de rollback/rebuild.
5. Coste: gratis primero; pago solo como excepción justificada y nunca autoactivada.
6. OLD vs NEW + tribunal.
7. Reutilizar o envolver antes de fabricar.
8. Si no hay demanda, catalogar.
9. Solo un gap real, útil y gratuito puede convertirse en candidato FACT-001.

## Límites de autoridad

- `environment=PREPROD` obligatorio.
- `prod_authorized=false`.
- `prod_write_authorized=false`.
- `trading_access=false`.
- `external_code_execution_authorized=false`.
- `paid_activation_authorized=false`.
- `factory_create_authorized=false`.
- multiempresa por `company_id` y versionado por `skill_id + skill_version`.
- decisión idempotente y trazable por evidencia.

## Criterio de aceptación

El cierre no se considera HECHO por existir el archivo. Deben pasar el contrato focalizado, Skill Capability Evolution existente, tribunal y regresión completa CEREBRO contra `main`. Tras merge, la integración con el AutoLoop debe consumir estas decisiones sin reintroducir una aprobación humana genérica para PREPROD; HUMAN_REQUIRED solo puede aparecer por las ocho causas canónicas y con evidencia.

## Rollback / rebuild

Rollback de este bloque: retirar el módulo, test, workflow y documentación añadidos por este cierre. No hay migraciones, cambios de esquema ni autoridad PROD. Rebuild: recrear desde este contrato y volver a ejecutar los gates focalizados + regresión completa.
