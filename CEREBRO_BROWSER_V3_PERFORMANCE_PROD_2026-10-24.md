# CEREBRO Browser V3 · Performance hotfix · 2026-10-24

- Base PROD preservada: snapshot Browser V3 multi-tab + ergonomía.
- Cambio: escritura humana cifrada agrupada en bloques de 55 ms.
- Cambio: polling visual de la vista NAVEGADOR de 900 ms a 300 ms.
- Seguridad: mismo AES-GCM, mismo `/owner/input`, sin credenciales nuevas.
- Runtime/worker/Gateway/schema: sin cambios.
- Coste incremental: 0 €.
- Rollback: snapshot PROD anterior `df9eee755410dec788e39153bed263e6fea7da7e`.
- PR de integración: #918, gates verdes antes de promoción.
