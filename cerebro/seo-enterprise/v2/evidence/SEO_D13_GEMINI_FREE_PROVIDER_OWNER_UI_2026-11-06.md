# CEREBRO SEO-D13 · Verificación autenticada de Google AI Studio y GitHub

Fecha **2026-11-06**. Alcance **solo lectura y preparación de IAM en PR #22 DRAFT**.

## Evidencia de UI autorizada

Se consultaron con consentimiento expreso del propietario las sesiones autenticadas disponibles mediante el conector Opera Browser, leyendo Google AI Studio → **API keys** y la página de GitHub → **Settings / Secrets and variables / Actions**.

Google AI Studio mostraba **dos claves claramente diferentes**:

| Nombre simbólico visible | Proyecto visible | Nivel de facturación visible | Consecuencia |
|---|---|---|---|
| `CEREBRO_GEMINI_FREE_API_KEY` | `CEREBRO-GEMINI-FREE` | `Nivel gratuito`, acción `Configurar la facturación` | Candidata correcta de coste cero para SEO LAB |
| `CEREBRO_GEMINI_API_KEY` | `Fenix Capital` | `Nivel 1`, acción `Ver facturación` | **EXCLUIDA** de SEO de coste cero |

La segunda clave corresponde a un proyecto con **facturación de pago** y nunca debe usarse como sustitución silenciosa de la primera. Ningún valor de clave, cabecera de autorización, token, captura con secretos ni identificador de cuenta se ha registrado aquí.

La sección **Repository secrets** del repositorio `carlosjmunoz78/fenix-capital-inmo-map` no contenía `CEREBRO_GEMINI_FREE_API_KEY` ni `CEREBRO_GEMINI_API_KEY` en el momento de la observación. No se puede inferir desde ello el inventario de organización, otros repositorios o vaults externos. Se corroboró en [GitHub Action 42211783450](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42211783450) la ausencia de la antigua variable en el contexto de ese runner.

## Preparación IAM aditiva

- Nueva credencial **solo simbólica** `credref:cerebro-gemini-free-api-key`, destinada a `CEREBRO_GEMINI_FREE_API_KEY`.
- Nueva identidad `iam:seo-gemini-free-lab` y conector `connector:seo-gemini-free-lab` limitados a `LAB`, uso `SEO-D13`, solo fuentes SEO públicas sin datos de clientes.
- Se conservaron sin modificaciones las conexiones anteriores y sus valores; **no** se ha registrado ni subido ninguna clave.
- El adaptador de redacción cloud debe referenciar únicamente la clave **FREE**, nunca `CEREBRO_GEMINI_API_KEY`.
- La inferencia real continúa bloqueada hasta registrar el secreto correctamente en una ubicación segura, certificar la sesión/proyecto y montar un límite físico de llamadas y presupuesto. Un dato de UI no equivale a comprobación de facturación automatizada perpetua.

## Barreras

No se debe activar la facturación del proyecto Free, contratar nada, copiar secretos a archivos/PRs/issues/logs ni usar la clave del proyecto `Fenix Capital` (Nivel 1) sin una autorización económica distinta. No tocar WordPress, App/CRM, PROD, main ni otros Workers.

Estado **FREE_PROJECT_AUTHENTICATED_UI_VERIFIED**, **GITHUB_REPO_FREE_SECRET_MISSING**, **D13_CLOUD_AI_NOT_GENERATING**, **0_API_CALLS**, **NO_COSTS**.
