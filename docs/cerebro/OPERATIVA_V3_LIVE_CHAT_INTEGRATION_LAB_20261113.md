# CEREBRO Operativa Premium V3 sobre LIVE chat · 2026-11-13

**Rama:** cerebro/operativa-v3-live-chat-bridge-lab-20261113
**Base física:** 99d3aca48229f6bd730d51bd1d21aedb226dc763 · PR #58 hotfix ya publicado.
**Origen diseño:** 5a8e8d041028323da840fe9d6123b01f35f65b7c · PR #57 DRAFT, NO fusionado.

## Contrato
- Preview solo con `/cerebro?section=operativa&visual_lab=cockpit-v3`.
- `/cerebro?section=operativa` mantiene el componente y chat publicados (mismo source).
- No usar el puente heredado basado en DOM ni una segunda instancia de `CerebroConsoleShell`.
- V3 incorpora el componente `useCerebroOperativaChat` original: envío autenticado, chat, dictado, voz y confirmaciones existentes.
- El filtro de compañía solo permite ejecutar en `fenix`. AION, CAPTACASA y ALL son visualizaciones restringidas, nunca concesión de pertenencia.
- El Owner Universe remoto sigue siendo la ruta LAB de solo lectura, nunca fuente de decisiones productivas.
- Persisten la barra corregida, JARVIS, Neural y Browser sin cambios.
- Sin operaciones de escritura salvo chat habitual del propietario y sin despliegue PROD.
- Integrar a producción solo tras CI, pruebas en preview, autenticación real, OLD vs NEW, controles y rollback.

## Rollback
No publicar este branch. El prod físico permanece en `99d3aca48229f6bd730d51bd1d21aedb226dc763` / Vercel `dpl_94Wp3aB42YykrpDwrM2VNqk2br9i`. Para retirar la vista previa, descartar rama/PR.

## 13 Nov · CORS del preview resuelto por puente propio Vercel (sin tocar Supabase)
- Preview Vercel de PR #59 únicamente: API REST `/api/cerebro-preview-gateway`, con `VERCEL_ENV=preview`, allowlist de host, comprobación SERVER-SIDE de `CARLOS-ADMIN` en cada solicitud, JWT de sesión y origen local. Permite health/preferences/activity/universe de solo lectura y conversación QA sin token de confirmación ni escrituras.
- Rutas PROD, CORS Supabase, permisos, CRM, App y `main` no se modifican. No insertar claves secretas ni service-role en cliente.
- `visual_lab=cockpit-v3` + hostname preview son obligatorios; la Operativa antigua usa la ruta original.
- Bloqueos restantes: probar conversación real de un usuario desde el nuevo preview; comprobar voz mediante interacción humana; confirmar que las otras cuatro interfaces permanecen sin cambio; promocionar solo tras aceptación.
