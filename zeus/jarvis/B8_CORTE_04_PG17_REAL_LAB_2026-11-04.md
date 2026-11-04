# B8 CUT04 · PostgreSQL 17 real LAB
Código HEAD `2027f91694630ec83bb5d22076b34e0a7a031640`.
Prueba `REAL_LAB_INTEGRATION` en workflow https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41786409397 **SUCCESS**.
Usa PostgreSQL17 efímero de Actions + contrato B8 existente, con un esquema de fixture privado de CI, nunca Supabase. Dos empresas sintéticas con dos compromisos internos: fila separada/tenant, idempotencia concurrente, un proceso reconstruido no duplica, intento de firma/pago y acceso ajeno bloqueados, pg_dump/restore comprobados con relanzamiento.
El sistema real de IAM/B3/Company Registry/Supervisor permanece MOCK; B8 NO está unido a JOB-001 duradero real, y no existe certificación PROD. B3/B4 PROD no modificados; REGISTRY 179 preservado.
Node 413/413 PASS `41786409345`; B7 `41786409404` success; B4 PG `41786409344` success; Governed `41786409313` success con deploy omitido.
No suscripción, no modelo de IA de pago; coste efectivo minutos GitHub a verificar según cuenta.
Estado `PARCIAL_LAB_GREEN_REAL_PG17_PROD_LOCKED`. Next: `B8_CUT05_REAL_COMPANY_REGISTRY_JOB001_CONTRACT_GATE_AND_SUPERVISOR_INTEGRATION`.
