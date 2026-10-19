# CEREBRO Universal Device Pairing / Command Envelope V2

**Estado:** CANDIDATE_PREPROD / PARCIAL  
**PROD:** DENEGADO  
**Coste adicional:** 0 EUR

## Problema confirmado

El perfil de transporte heredado puede contener `company_id`, `venture_id` y `environment` fijos. Ese registro se conserva por compatibilidad, pero **no puede ser la autoridad de tenant** de un Device Universal multiempresa.

La identidad física permanece estable (`canonical_device_id` + aliases). El alcance empresarial se autoriza **por misión/comando**.

## Contrato V2

Cada comando exige como mínimo:

`request_id · idempotency_key · issued_at · expires_at · device_id · company_id · venture_id · engine_id · environment · version · capability · action · policy`

Reglas:

- solo `LAB` / `PREPROD`;
- `PROD` fail-closed;
- identidad presentada debe ser canonical o alias registrado;
- `company_id` / `venture_id` proceden del envelope V2, nunca del perfil Browser legacy;
- policy contiene allowlists explícitas de company/venture/engine/capability/action;
- scope cruzado se deniega;
- secretos crudos se deniegan recursivamente;
- únicamente `credential_ref` / `credential_refs` pueden viajar como referencias;
- ventanas temporales acotadas;
- `request_id` repetido = replay rechazado;
- mismo idempotency key + mismo payload = retorno cacheado / no reejecución;
- mismo idempotency key + payload distinto = conflicto;
- una acción mutante no puede quedar `PASS` sin semantic readback verificado;
- receipts se sanejan por whitelist y mantienen `prod_authorized=false` / `trading_access=false`.

## Compatibilidad OLD vs NEW

### OLD conservado

`browser-profiles.json` y `register_profile()` siguen siendo evidencia de transporte/perfil. No se borran ni reescriben.

### NEW envolvente

`wrapLegacyTransportProfile()` reduce ese registro a routing/transport y fija `tenant_authority=false`. El Command Envelope V2 aporta el scope dinámico multiempresa.

Esto permite que un mismo dispositivo autorizado atienda Fénix, AION u otra empresa sin crear un fork del dispositivo ni copiar perfiles para convertir metadatos legacy en autoridad.

## Seguridad

HUMAN_REQUIRED conserva exactamente ocho códigos canónicos. MFA/CAPTCHA/login no se convierten en códigos inventados ni se eluden. El Credential Broker/Vault entrega referencias, no secretos.

## Tests incluidos

- canonical y alias;
- tenant dinámico aunque el perfil legacy tenga otra empresa;
- PROD denegado;
- policy obligatoria;
- aislamiento cross-company;
- raw secrets denegados / credential refs admitidos;
- expiración / future skew / lifetime;
- replay request id;
- idempotent replay;
- idempotency payload conflict;
- HUMAN_REQUIRED exacto;
- semantic readback obligatorio para mutaciones.

## Criterio de promoción

CI verde **no** equivale a `CONFIRMED_OPERATIONAL`. Al volver Carlos a la oficina, este contrato debe consumirse en un único batch físico junto con Device Universal/Evidence Host, synthetic remote roundtrip, restart persistence, rollback y recovery sintético de Vault.
