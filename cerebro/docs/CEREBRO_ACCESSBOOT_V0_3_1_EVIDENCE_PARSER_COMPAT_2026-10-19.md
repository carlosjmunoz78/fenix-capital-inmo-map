# CEREBRO ACCESSBOOT v0.3.1 · EVIDENCE PARSER COMPATIBILITY

Estado: PARCIAL / CANDIDATE_PREPROD
PROD: DENEGADO
Coste adicional: 0 EUR

## Evidencia física previa
- Device Universal v0.2.4 ejecutado físicamente.
- Browser Agent Host 127.0.0.1:8765 GREEN.
- Device Agent 127.0.0.1:8766 GREEN.
- Evidence Host 127.0.0.1:8767 GREEN, sanitized=true, prod_allowed=false.
- canonical_device_id desktop-4c008d88919f.
- alias desktop-74ca87506edbd7a5.
- tenant_binding DYNAMIC_MULTI_COMPANY.
- Opera oficina canonical binding queda en `cerebro/registry/opera-oficina-binding.v1.json`.

## Incidente observado
Tras ejecutar CEREBRO_ACCESSBOOT v0.3.0, Evidence Host siguió mostrando `physical_acceptance.present=false`.

La causa aislada es una incompatibilidad de serialización/parsing: Windows PowerShell 5.1 puede escribir UTF-8 con BOM mediante `Set-Content -Encoding UTF8`, mientras que el parser JSON Go del Evidence Host no acepta BOM como JSON puro. Este fallo es de evidencia/compatibilidad y NO demuestra fallo del Browser, Device Agent ni Evidence Host.

## Corrección v0.3.1
- receipt de aceptación escrito con `System.Text.UTF8Encoding(false)`;
- wrapper Go elimina BOM si existiera;
- wrapper Go valida `json.Valid` antes de terminar;
- si el runner PowerShell falla o el receipt no es JSON válido, AccessBoot genera fallback saneado UTF-8 sin BOM;
- Browser 8765 no se reinstala ni repite;
- Device 8766 no se sustituye;
- Evidence Host 8767 se conserva;
- perfiles legacy no se reescriben;
- PROD sigue false.

## Artifact local candidato
- `CEREBRO_ACCESSBOOT_V0_3_1/CEREBRO_ACCESSBOOT.exe`
- SHA256 `6d55566b792b8d500e0a4f63e4261d2e1fef88d8aad3e73ec24fe7283d43f68f`
- Windows amd64 PE32+ build PASS.

## Regla anti-loop
No volver a ejecutar `CEREBRO DEVICE PHYSICAL ACCEPTANCE V0.2` ni AccessBoot v0.3.0. El siguiente intento físico válido es únicamente AccessBoot v0.3.1 o posterior que contenga esta corrección.

No declarar CONFIRMED_OPERATIONAL hasta leer el receipt físico saneado desde Evidence Host y cerrar los gates físicos aplicables.