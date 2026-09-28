# UNIVERSAL_PLUGIN_FULL · Capability audit · 2026-09-28

## Estado
PARCIAL AVANZADO. Se reutilizan capacidades existentes; no se crea un segundo plugin monolítico ni se toca PROD.

## Evidencia viva WordPress
- 28 plugins instalados.
- Fénix Core Guard 1.0.5 activo.
- Fénix CEREBRO Leads 1.3.2 activo.
- Fénix CEREBRO Maintenance 0.1.1 activo.
- Fénix SEO CEREBRO Bridge 0.4.1 activo.
- Fénix SEO REST Bridge 1.0.0 activo.
- Cowboy MCP 1.6.8 activo.
- WPVibe está instalado/activo, pero queda fuera de la vía operativa canónica.
- Make Connector está activo, pero no es dependencia del rollout.
- Core Guard: operational_writes_allowed=false en PROD.
- Jaén: piloto CITY_GROWTH certificado; MASS permanece false.

## Cobertura actual

| Capacidad | Proveedor reutilizado | Estado |
|---|---|---|
| Discovery | REST routes + Abilities | EXISTENTE |
| Content read/create/update | Cowboy WordPress native | EXISTENTE |
| Draft SEO support | Core Guard create-support-post-draft | EXISTENTE EN PLUGIN / exposición por conector POR AUDITAR |
| Publish transaction | Core Guard publish-post-transaction | EXISTENTE EN PLUGIN / exposición por conector POR AUDITAR |
| SEO read/write | Cowboy + SEO REST Bridge | EXISTENTE |
| Media upload/read/update | Cowboy media | EXISTENTE |
| Lead capture | Fénix CEREBRO Leads REST + Elementor hook | EXISTENTE |
| Lead magnet gate | Fénix CEREBRO Leads | EXISTENTE, FÉNIX-SPECIFIC |
| Cache | Cowboy + Core Guard | EXISTENTE |
| Live verify | Core Guard | EXISTENTE |
| Backup/checkpoint | Cowboy + Core Guard snapshots | EXISTENTE |
| Rollback | Cowboy undo/checkpoint + Core Guard restore | EXISTENTE |
| Rebuild/update | CEREBRO Maintenance | EXISTENTE |
| Form management/creation | No forms tools exposed | GAP |
| Newsletter creation/scheduling | No newsletter ability exposed | GAP |
| Multiempresa config | Current live plugins contain Fénix-specific constants/URLs | GAP |
| Provider-neutral gateway | Added in CEREBRO runtime | HECHO V0 |

## Decisión arquitectónica
No reemplazar Core Guard, Leads, SEO Bridge, Elementor, Cowboy ni Maintenance.
PLUGIN-UNIVERSAL-001 es un gateway lógico y policy layer sobre proveedores existentes.

Orden:
CEREBRO Gateway -> PLUGIN-UNIVERSAL-001 -> provider adapter -> WordPress capability.

No:
CEREBRO -> modelo IA -> WordPress directo.

## Gaps para FULL
1. FORM_MANAGE: contrato neutral para crear/configurar formularios y bind de captación.
2. NEWSLETTER_MANAGE: dos streams separados (particulares / inmobiliarias), scheduling semanal y evidencia de envío.
3. MULTIEMPRESA: eliminar hardcodes de Fénix del contrato universal; moverlos a company config.
4. Exponer/confirmar abilities Core Guard de content/media/city executor en el transporte canónico.
5. PREPROD físico: staging connector debe responder antes de cualquier escritura.
6. OLD vs NEW y rollback real.

## Seguridad
- PROD: no writes desde este bloque.
- Mutaciones exigen confirmación/idempotency.
- WPVibe no se usa.
- Make no se usa como dependencia.
- Coste adicional objetivo 0 €.
