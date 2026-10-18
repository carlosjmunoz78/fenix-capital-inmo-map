# HERRAMIENTAS, RUTAS Y OPERACIÓN · IA

## NAVEGADOR
**Preferencia:** Opera Browser Connector.

Usarlo para:
- inspección visual;
- breakpoints;
- flujos de formularios;
- consentimiento;
- navegación real;
- verificación de CTA;
- screenshots/evidencia;
- comprobación de layout móvil;
- visual regression.

No usarlo para:
- exponer secretos;
- copiar tokens a chat;
- cambiar PROD.

Si Opera no está disponible:
1. continuar con GitHub/WordPress/Notion y análisis determinista;
2. registrar `CAPABILITY_GAP_BROWSER`;
3. no declarar QA visual/E2E como PASS;
4. solo HUMAN_REQUIRED si bloquea el cierre.

## WORDPRESS STAGING
Usar conector STAGING existente.
Reglas:
- no tocar PROD;
- antes de write: identificar ID/slug/template/componente;
- write mínimo;
- test inmediato;
- rollback conocido.

## GITHUB / CEREBRO
Repo: `carlosjmunoz78/fenix-capital-inmo-map`
Branch: `cerebro/seo001-staging-audit-v5-20261018`

Rutas:
- V4 immutable: `docs/web-baseline/2026-10-18-v4/`
- V4 audit: `docs/web-audit/2026-10-18-v4-multilayer/`
- Governance: `docs/governance/`
- Ops: `docs/ops/`
- Crear para V5:
  - `docs/web-remediation/2026-10-18-v5/`
  - `docs/web-baseline/<fecha>-v5/`
  - `docs/learning/web-quality/`
  - `docs/handoffs/`

No sobrescribir V4.

## NOTION
Mantener:
- página maestra de auditoría;
- Gold Standard;
- estado V5;
- finding matrix resumida;
- informe final;
- enlaces/rutas canónicas CEREBRO;
- aprendizaje reusable.

No duplicar decenas de MB del baseline: Notion es índice operativo; CEREBRO/GitHub es evidencia canónica binaria/textual.

## COSTE
Orden:
determinista → OSS/local → herramienta existente → free tier → self-hosted → externo barato → pago justificado.

## COMUNICACIÓN
Durante SUPERLOOP:
- no pedir permiso por cambios seguros/reversibles en STAGING;
- informar solo hitos grandes;
- no detenerse tras commit/test rojo;
- corregir y continuar.

## SEGURIDAD
Nunca imprimir:
- JWT;
- cookies;
- sesiones;
- API keys;
- secrets;
- credenciales.
