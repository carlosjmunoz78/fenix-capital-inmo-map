# CHECKLIST DE REINICIO + ANTI-LOOP · IA

## AL ABRIR UN NUEVO CHAT
1. Leer README.
2. Leer estado máquina.
3. Verificar únicamente evidencia mínima:
   - rama existe;
   - V4 intacto;
   - Gold Standard existe;
   - latest state/next_block.
4. No repetir crawl/audit completo solo para “ponerse al día”.
5. Entrar en `next_block`.

## ANTI-LOOP
No:
- volver a “auditar todo” si ya existe evidencia válida;
- rehacer documentos por estilo;
- repetir fixes ya cerrados;
- pedir confirmación en cada paso;
- detenerse tras un rojo corregible;
- cambiar slugs sin necesidad;
- crear motores duplicados;
- confundir STAGING noindex con fallo;
- tocar PROD.

Sí:
- targeted revalidation tras cada fix;
- full regression tras lotes estructurales;
- persistir decisiones;
- convertir repetición en automatización;
- actualizar next_block.

## REGLA DE SATURACIÓN
Antes de que el chat pierda contexto:
- exportar handoff actualizado;
- incluir últimos commits/cambios;
- incluir exact next_block;
- incluir TODO pendiente;
- incluir HUMAN_REQUIRED;
- incluir aprendizaje nuevo.

## HUMAN_REQUIRED
Solo:
LEGAL_REQUIRED
SIGNATURE_REQUIRED
LOW_CONFIDENCE
HIGH_RISK
POLICY_CONFLICT
SECURITY_INCIDENT
MONEY_LIMIT
CUSTOMER_HUMAN_REQUEST

No usar HUMAN_REQUIRED por comodidad o porque un test falle.
