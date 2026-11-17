# Notion FACT-001 · continuación verificable 100→125 (sin ejecutar)
Fecha 2026-11-12. Fuente inmutable: `checkpoints/batch-75-100-composite-d1-cas.v1.json` y respaldo fuera de Notion SHA256 `8501eb64...`, D1 CAS 100/v4.
`notion-batch-continuation-guard.mjs` rechaza offset <100, salto >100, entorno distinto de LAB, índice alterado, ZIP no privado/no cifrado/no cotejado, versión CAS distinta, D1 errónea y datos de cobertura no demostrados.
NUNCA implica que el backup real esté completo: 100 de 6632, sin media, comentarios, permisos, escrow independiente o restauración real de contenido. El módulo no toca proveedor, no lee Vault, no dispara CI de ejecución, no activa cron/cola, y no permite escalar a PROD.
Siguiente trabajo: activar sólo un backend de lectura previamente aprobado capaz de usar este contrato, publicar los 25 sobres cifrados, leerlos desde Drive, probar restauración aislada y entonces aplicar CAS 100→125. Un CI verde de la guarda no sustituye ninguno de esos gates.
