# FACT-001 · Notion · Backup lote 75→100 consolidado, D1 CAS 100/v4
Fecha: 2026-11-11 · PR #44 DRAFT · company_id=fenix-capital / engine_id=FACT-001 / LAB / v1.0.0

## HECHO FÍSICO
- La ejecución unitaria 75→100 no pudo recuperar el objeto #23 por **HTTP 546 WORKER_RESOURCE_LIMIT** tras cifrar 23 páginas. Se conservaron los 23 sobres sin mover checkpoint: [GitHub #42933659552](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42933659552), artifact 13816509464, ZIP SHA256 `642f2f933d00b5b020aedf5dd69639f66d8c7e0754a5481e93320c66b737fd18`, [Drive privado](https://drive.google.com/file/d/1MeUf70NJ6l2URxIjeYy9jO_5JPeYTh8x/view).
- La página #24 se recuperó independientemente: [GitHub #42934881464](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42934881464), artifact 13817862497, 178 bloques, SHA256 `cce23767fc9752d76bb38d038f7f6425815aebdc4202767252c90fc217edfe40`, [Drive](https://drive.google.com/file/d/1n9F6gScAEzXpGZzrk2Gp17faGuRdKMB1/view).
- La fuente #23 se recuperó mediante **48 fragmentos AES256-GCM**, 24 registros y 2.977 bloques: [GitHub #42936490272](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42936490272), artifact 13819260587, SHA256 `f46c31304920cdd5c00ea280c32dcd0dd3d48a3a172c2701fe171059028ba4ef`, [Drive](https://drive.google.com/file/d/1dVc9OBKwnaGUVSmX7hTMfBvimOcHNjq7/view).
- Los tres componentes forman un ZIP **composite completo** de 25 objetos: **24 páginas, 1 fuente, 24 registros y 3.877 bloques**, sin escrituras Notion. Manifiesto dentro de ZIP `FACT001-NOTION-ENCRYPTED-BATCH-75-100-COMPOSITE-V1`, hashes de cada componente y 48 fragmentos.
- [Drive privado ZIP consolidado](https://drive.google.com/file/d/1jqCgm1qY2euqCy9uO_KGHrV4hMqSI0BC/view?usp=drivesdk): 3.829.582 bytes, **SHA-256 `8501eb64a02b3bdaa9351fe2c460e81181781e399da7f839f86f0070b1a0c49b`** cotejado con D1 CAS; descarga independiente y test CRC ZIP completo correctos. No contiene clave AES ni objetos en texto claro.
- **D1 CAS aislada** `cerebro-fact001-notion-checkpoint-lab-eu` `bc085807-a6ca-4c56-a288-fe56716fec6f`: lectura directa verifica **100/v4**, ZIP SHA e ID Drive exactos; auditoría transiciones 25→50, 50→75 y **75→100**, tres registros. Ningún cambio en D1 de recuperación original acreditado en este paso.
- [Checkpoint de evidencia](../services/notion-batch-engine-lab/checkpoints/batch-75-100-composite-d1-cas.v1.json).

## Cobertura acumulada
- **100/6.632 objetos indexados**: 96 páginas + 4 fuentes, 122 registros de estas fuentes en los últimos tres lotes. Restan 6.350 páginas + 182 fuentes en esta secuencia, sin contar pilotos anteriores que puedan solaparse.
- **Estado global Notion PARCIAL · 6/11 controles**. No se exportan binarios adjuntos, comentarios, permisos ni versiones históricas; no existe escrow independiente de clave ni restauración física de contenido en Notion LAB. Backup de inventario accesible no equivale a todo el workspace.
- D1 Cloudflare Free 10/10; sin nuevas D1 ni suscripciones. PR #44 DRAFT; broker original v33 y App/CRM/Notion original sin escrituras por este proceso.
- Para siguiente lote 100→125: preparar y probar procedimiento por fragmentos de forma preventiva; no repetir el lote 75→100. Validar idempotencia, OIDC, integridad, readback Drive y CAS antes de avanzar.
