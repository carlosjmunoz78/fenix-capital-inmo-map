# FACT-001 · P2 Supabase operador permanente · Estado vivo 2026-11-11

**Estado:** PARCIAL, no habilitar escritura arbitraria ni alterar App/CRM.

## HECHO / EXISTENTE
- El secreto de servicio `cerebro_supabase_management_pat_v1` figura en Vault del proyecto `cluhljgonannaafpmblx`, creado 2026-11-10; solo metadata, nunca valor.
- Servicio compartido `cerebro-fact001-headless-provider-lab` **ACTIVE v33**, ESZIP SHA256 `645ae3995fa0cf478d589871f00f029be2ee6bfe6228b2e1a8ef1645b98022ec`. Usa Vault y firma GitHub OIDC. Mantiene exclusivamente rutas existentes de lectura, identidad y planificación; no sustituir.
- La operación previa contra Supabase Management API **DELETE de una sola Edge Function sintética aislada** fue verificada en Actions #42816960750 y el recurso quedó 404. No repetir ni crear funciones basura.
- Conector de ChatGPT y credencial propia del servicio CEREBRO son distintos. Acceso de este chat a Supabase SQL/Edge management no se traslada automáticamente a CEREBRO Gateway.

## Todavía NO hecho
- Un adaptador persistente de gestión en el Gateway con permisos por operación, `Edge Functions`, `Storage`, `DB` y `Auth`, con snapshots por recurso, recuperación física y pruebas de aislamiento.
- E2E físico de órdenes firmadas del propietario desde CEREBRO Console y automatización LAB, cola duradera, idempotencia y observabilidad conjunta.
- JWT owner canary y promoción bajo gates. No conceder `service_role` a frontend ni usar gestión de Auth/DB sobre los datos de clientes como fixture.

## Contrato de siguiente cambio
Ampliar el **mismo runtime compartido** por módulo, no crear servidor por proveedor. Comenzar con Edge Function sintética o Storage LAB propiedad del contrato, preflight de metadata y snapshot, GET/POST/PATCH/DELETE restaurables y pruebas negativas; DB/Auth solo en entidad sintética aislada con RLS y tenant seguro. Exigir 4D, permiso de recurso, ventana temporal, hash before/after, idempotency_key, backup/rollback y costes medidos. No desplegar ni hacer writes hasta disponer de tests/rollback del mismo artefacto.

**Siguiente bloque:** `SUPABASE_MGMT_PERSISTENT_WRITER_LAB_ONLY_WITH_REBUILD`. PROD App/CRM, DNS, Notion y Trading inalterados; coste adicional contratado 0 €.
