# UMS-001 · Evidencia física LAB · 2026-11-12

- Render PNG técnico canary por Queue: `UMS001-LAB-CANARY-20261112-CLOSURE1`, 52.825 bytes, SHA `be2c6d611ee5a16223bc65868358362b3ebdeb86e39abdd45cee756c84fb64c7`, QA pendiente.
- Render FLUX por Cloudflare AI directamente: `UMS001-LAB-AI-20261112-CORDOBA`, JPEG 783.605 bytes, SHA `bdd5cc9dadb306d01dbfe6a6b9fcf3ac6a0e9c19f1803280b1258c086d703f37`; lectura posterior de KV con SHA coincidente.
- E2E nuevo Worker/Queue: `UMS001-LAB-IMAGE-E2E-20261112-A1`, JPEG 813.737 bytes, SHA `00106931b24636260316c0946afc5e3f8666dd4fda0f4bc596961b1505e173c0`, `PRIVATE_READY`.
- E2E desde cola universal ChatGPT→Router→Factory: `UMS001-LAB-CHATGPT-ROUTED-20261112-V1`, JPEG 681.215 bytes, SHA `20a41f9d887a8020f536581a8c25a452f072885bacccf2be10641a5838bf474d`.
- Reconciliación y prueba definitiva: `UMS001-LAB-CHATGPT-RECONCILED-20261112-V1`, JPEG 705.560 bytes, SHA `e56d5444acf7364e68078e392418fc73e8cd823f5145f37ec2ae79c2fa7e476a`; recibo de factory `PRIVATE_READY` y auditoría del Router reconciliada `PRIVATE_READY` al mismo SHA, con mensaje `TECHNICAL_QA_PASS`.
- Caso negativo: solicitud sin brief, esperada denegación (sin generación), `UMS001-LAB-CONTROLLED-MISSING-BRIEF-20261112-V1`.
- Quota ledger de LAB `meta/ums001-ai-image-factory/v1/quota/2026-11-12`: `count=3`, `limit=3` tras tres llamadas a factory. La llamada directa aislada anterior no forma parte de este contador; por eso no constituye medición fiable de consumo total de cuenta.
- Router mantiene `GATEWAY_ENABLED=false`, la fábrica privada no expone subdominio ni crons. App/CRM/Supabase PROD/DNS sin modificaciones.
- Coste facturado: NO VERIFICADO por permisos de billing; no presentarlo como 0 € comprobado.
- QA visual/marca no certificado; la publicación está deshabilitada.

**Estado:** HECHO: pipeline privado en LAB y reconciliación de una solicitud; PARCIAL: integración M2M Social/SEO/otros motores, QA visual/marca, control transaccional de cuota, billing y entrega comercial.
