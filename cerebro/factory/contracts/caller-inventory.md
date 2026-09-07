# Caller Inventory · PREPROD Audit

Estado: en construcción. Solo lectura sobre sistemas existentes.

## Solapamientos a cerrar antes de consolidar
- `fenix-app-gateway` ↔ `fenix-ana-api` / `fenix-ana-canonical`.
- `fenix-app-gateway` ↔ `fenix-document-actions` ↔ `fenix-evidence-api` ↔ `fenix-document-intelligence*`.
- `fenix-app-gateway` ↔ `fenix-bank-api`.
- `fenix-app-gateway` ↔ `fenix-directory-api` ↔ `fenix-directory-actions`.
- `fenix-app-gateway` ↔ `fenix-expediente-stage`.
- `fenix-communications-gateway` ↔ Brevo/WhatsApp/webhooks.

## Tablas sensibles con RLS desactivado detectadas en PROD
- `fenix_prod.special_cases`
- `fenix_prod.special_case_people`
- `fenix_prod.expediente_stage_history`

No habilitar RLS ni cambiar policies hasta identificar todos los callers y reproducir comportamiento en PREPROD.

## Criterio de cierre
Cada caller debe registrar: consumidor, ruta/función, RPC, tabla/storage, tipo de acceso (R/W), auth/RBAC, idempotencia, entorno, evidencia, riesgo de ruptura y alternativa/rollback.