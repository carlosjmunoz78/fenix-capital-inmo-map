# SEO-D13 / Gemini Free LAB · comprobación física de conectividad

**Fecha** 2026-11-06. **Empresa** fenix. **Motor** SEO-001. **Entorno** LAB / PREPROD. **PR** #22 DRAFT sin merge.

## Registro existente y límites

- El registro canónico `cerebro/registry/connector-auth-registry.v0.json` ya contiene `connector:gemini-free-lab` con uso exclusivamente `LAB`.
- El registro canónico `cerebro/registry/credential-reference-registry.v0.json` contiene la referencia simbólica `credref:cerebro-gemini-api-key`, que apunta al secreto GitHub Actions `CEREBRO_GEMINI_API_KEY`. **Registrar una referencia no prueba que el secreto esté disponible.**
- `cerebro/skills/zero-cost-provider-evidence.v0.json` recoge evidencia histórica de una generación sintética Free el **2026-10-07**, GitHub run **37593936623**, con modelo `gemini-3.1-flash-lite`. Ese inventario tiene `credential_state:UNBOUND`. El run histórico no fue accesible para confirmar en la actual conexión (GitHub devolvió HTTP 404), por lo que solo consta **evidencia histórica registrada**, no validación de disponibilidad actual.
- La documentación oficial de Gemini Developer API ofrece un nivel gratuito para `gemini-2.5-flash-lite`, pero **el nivel de facturación se hereda de cada proyecto de Google**, no del modelo ni de la clave individual. Documentación `https://ai.google.dev/gemini-api/docs/pricing` y `https://ai.google.dev/gemini-api/docs/billing`.

## Verificación ejecutada hoy

CI [GitHub Actions 42211783450](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42211783450), **3/3 tests PASS**. Probe seguro de una única petición GET de metadatos a `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite` **solo si existe** la credencial en ese trabajo.

**Resultado real del paso remoto**:

```json
{"status":"HOLD","reason":"SECRET_NOT_PRESENT","key_present":false,"model_available":false,"billing_tier_verified":false,"inference_calls":0,"wordpress_writes":0,"additional_cost_eur":0,"can_publish":false}
```

Esta observación significa **clave no inyectada en el runner de esa PR**. No demuestra que no exista en otros repositorios, organizaciones o vaults, ni que Google haya revocado la clave. No se intentó conectar a Gemini y no se envió ninguna credencial.

CI de protección [42212216746](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42212216746) **5/5 PASS**. Se añadió un bloqueo en `runSeoCloudWriter` para impedir que flags booleanos `provider_free_tier_confirmed=true` y `billing_disabled_confirmed=true` fabricados por un caller habiliten consumo en una cuenta realmente de pago. **No existe todavía un verificador autenticado de facturación de proyecto**, por lo que el ejecutor solo devuelve `HOLD_GEMINI_PROJECT_BILLING_ATTESTATION_NOT_AVAILABLE_NO_INFERENCE`.

## Ruta de desbloqueo segura

1. Comprobar desde un flujo seguro y confiable del repositorio (no un código de una PR sin revisar) qué secretos o scopes existen. No pegar ni mostrar la clave en chats, issues, logs, diffs ni archivos de evidencias.
2. Identificar el **proyecto exacto** propietario de esa clave en Google AI Studio, comprobar que el estado figura **Free y sin cuenta de facturación asociada**, registrar evidencia autenticada y fecha para el gate de coste.
3. Disponer de un verificador de identidad/IAM válido, con permiso mínimo para la lectura de estado. **Nunca confiar exclusivamente** en `has_secret` o `billing_disabled_confirmed` recibidos en una llamada API.
4. Una vez acreditados permisos y costes, implementar gate que valide la evidencia dentro del runtime e invoque una sola generación sintética; entonces enlazar salida con QA, fuente, 6 FAQ por artículo / 8 por landing, JOB-001, productora UMS-001 y tribuna.
5. Mantener `can_publish=false`, gastos 0, cero suscripciones nuevas, Core Guard Wordpress bloqueado hasta pruebas de backup/rollback y permisos firmes.

## Estado físico

`CONNECTOR_REGISTERED=EXISTENTE`

`PR_RUNTIME_SECRET_AVAILABLE=NO_OBSERVADO`

`CURRENT_GEMINI_PROVIDER_BILLING=POR_AUDITAR`

`D13_CLOUD_ADAPTER=TESTS_GREEN`

`REAL_CLOUD_TEXT_GENERATION=NOT_EXECUTED`

`LIVE_AUTONOMY=BLOCKED`

`PROD_MUTATIONS=0`, `ADDITIONAL_API_SPEND=0`.
