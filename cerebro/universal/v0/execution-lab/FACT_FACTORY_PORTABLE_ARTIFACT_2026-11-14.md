# FACT-001 · Factory LAB · paquete de 179 motores generado y recuperable

## Estado verificado
- En `CEREBRO Universal Gateway V0 LAB contract CI`, la fábrica `cerebro/factory-v1.mjs` genera físicamente 179 scaffolds y 3.222 archivos de motores, preservando los 177 IDs originales y añadiendo `HCI-001` y `MOTION-001`.
- En la ejecución [43588316694](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43588316694) terminó con `SUCCESS`, incluida la primera **subida de un paquete tangible** al almacén de artefactos de GitHub Actions: ID `14111940606`, tamaño comprimido 1.033.389 bytes, hash servido por GitHub `sha256:f3cd8fa5cdfa8c4526de9681b22204d465402190ef3bf3418bc5979c09a70c51`. Ese primer artefacto tenía retención de 1 día.
- El contrato actual del workflow conserva **7 días** el paquete FACT-001 de LAB y solo lo genera/sube al completar correctamente todas las pruebas anteriores (TypeScript, Vite, control de permisos, comprobaciones HTTP negativas, prohibición de PROD y staging). Ningún cambio automático en App/CRM/SEO/WordPress/DNS/main.

## Acceso para el propietario
1. Entrar en [PR #66](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/66).
2. Abrir el workflow `CEREBRO Universal Gateway V0 LAB contract CI` del commit más reciente con resultado `SUCCESS`.
3. En la sección `Artifacts`, elegir `FACT-001-179-SCAFFOLDS-LAB-...`; GitHub entregará un ZIP que contiene `skeleton-index.json` y `engines/<engine_id>/` con 18 archivos por motor.
4. Caducidad: 7 días; el artefacto se puede volver a generar mediante el workflow existente en la PR LAB, sin resucitar staging ni crear infraestructura por motor.

## Tratamiento como artefacto, NO despliegue
- **HECHO**: compilación física, verificación completa de 179×18 y ZIP almacenado en GitHub Actions.
- **NO HECHO**: 179 runtimes instalados, secretos creados, APIs de ejecución de negocio, políticas y tribunal por motor, promoción a PROD. No se deben presentar los scaffolds como trabajadores autónomos.
- **Ejecución real existente**: `fact.registry.attest` registra una certificación determinista en la tabla LAB; es una capacidad de auditoría, no de publicación ni ejecución comercial.
- **Costes**: cero suscripciones nuevas, recursos de CI/almacenamiento sujetos a cuota preexistente de GitHub; no se afirma coste medido cero.
- **Rollback**: revertir únicamente los cambios de la rama DRAFT #66 y conservar evidencias/snapshots; no merge a main ni cambios en Supabase PROD.

## Condiciones de suspensión
`staging.fenixcapital.es` permanece fuera de uso hasta nueva orden. El control de Hostinger se comprobó en hPanel: cuatro cron canary retirados, cron maestro conservado, fichero `job001_enabled_jobs.json` limitado a `[2,6,12,17,19]`; ver `../staging-suspension/HOSTINGER_CRON_INVENTORY_2026-11-14.md`.
