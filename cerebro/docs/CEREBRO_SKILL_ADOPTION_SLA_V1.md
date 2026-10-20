# CEREBRO Skill Adoption SLA V1

## Estado

- **HECHO:** guard operativo para medir el tramo `candidato válido -> PROD_CAPABILITY_AVAILABLE_READONLY`.
- **DEFINIDO:** objetivo operativo limpio de <= 5 minutos.
- **HECHO:** si a los 5 minutos la promoción exacta no está cerrada, el guard dispara una recuperación acotada reutilizando `CEREBRO Dynamic Skill Adoption V1`.
- **HECHO:** si a los 10 minutos las candidatas exactas siguen sin estar en `PROD_CAPABILITY_AVAILABLE_READONLY`, el ciclo queda en rojo (`SKILL_ADOPTION_SLA_RED`).
- **POR AUDITAR:** certificación del SLA como sostenido. No se considerará certificado hasta observar varios ciclos nuevos consecutivos sin intervención humana ni reparación manual.

## Contrato temporal

El reloj empieza cuando finaliza con éxito el workflow de intake que ha producido un artefacto exacto `cerebro-dynamic-adoption-proposal-<run_id>` con una o más capacidades en `FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY`.

- `0-300 s`: ventana normal de promoción autónoma.
- `>= 300 s`: recuperación automática acotada mediante `workflow_dispatch` del workflow gobernado de adopción dinámica.
- `>= 600 s`: rojo duro del SLA.

El guard comprueba las candidatas exactas del artefacto de origen contra el registro vivo en `main`. Solo considera cerrado el ciclo cuando todas están en `PROD_CAPABILITY_AVAILABLE_READONLY` con canary en `refs/heads/main`, `side_effects=false`, sin autoridad de escritura/mutación, sin ejecución de código externo, sin Trading y con coste adicional 0 EUR.

## Autoridad

Este guard **no** promociona por su cuenta, no modifica el repositorio, no concede permisos y no relaja tribunales, políticas ni contratos. Solo:

1. lee el estado de Actions y el registro dinámico;
2. mide el tiempo real;
3. dispara, una sola vez por ciclo, la recuperación mediante el workflow gobernado existente cuando se supera el umbral blando;
4. marca rojo al superar el umbral duro.

La escritura/mutación autónoma en PROD sigue fuera de este carril y depende de gates específicos del motor propietario.

## Rollback

Rollback inmediato: eliminar o deshabilitar `.github/workflows/cerebro-skill-adoption-sla-v1.yml`. Esto no altera `CEREBRO Dynamic Skill Adoption V1`, los intake existentes ni el registro de capacidades.
