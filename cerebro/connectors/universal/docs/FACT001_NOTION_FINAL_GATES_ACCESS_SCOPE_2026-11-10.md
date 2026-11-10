# FACT-001 / Notion — cierre de los tres gates finales (inventario, NO promoción)

Fecha: 2026-11-10. PR #44 DRAFT. Scope fenix-capital / FACT-001 / LAB / v1.0.0.

## Evidencias confirmadas; NO repetir
- Real Notion restore + re-Trash mediante identidad independiente de CEREBRO: GitHub Actions #42859689267 SUCCESS; no contenido original modificado.
- D1 EU Recovery existente con tres tablas Notion, dos triggers y un registro sintético `approved=0`; rollback de migración en clon aislado verificado, clon eliminado. Cron existente intacto.
- Respaldo lógico scoped D1 privado `/CEREBRO OS/Backups/FACT-001/FACT001_CEREBRO_RECOVERY_D1_EU_BACKUP_2026-11-10.zip`. SQL restaurado en SQLite nuevo; SHA256 4f16350fe1e709b2095b4658336ea6a7c0104a29ed02e7ccb58f8ab3476bbfeb. No es backup completo de Notion.
- GitHub OIDC firmado → Supabase headless LAB v13 → D1 Read desde Vault: HTTP 200; 401 anon/forjado, 403 PROD; Actions #42873202783 SUCCESS.
- El candidato de mutaciones permanece OFF y sin ruta activa; CI LAB #42873548729 SUCCESS.

## Gate 1 · D1 Write de mínimo privilegio
- API Cloudflare List Permission Groups, comprobada 2026-11-10: `D1 Write` ID `09b2857d1c31407795e75e3fed8617a1`, scope `com.cloudflare.api.account` (cuenta, no D1 individual). No afirmar que emitir un token D1 Write de cuenta equivale a limitarlo a Recovery D1.
- Cloudflare cuenta tiene múltiples D1 de sistemas distintos; NO usar token account issuer con Billing Write / Integration Write como credencial runtime. No crear ningún token de escritura que no tenga mecanismo seguro de almacenamiento, rotación/revocación y perímetro verificable.
- Camino preferente: instancia Worker LAB con **binding de D1 exclusivamente al UUID 1305f791-7c44-47f9-946b-f330a09c88aa**, sin URL pública ni nuevas suscripciones, con autenticación service-to-service y política de orden/permiso; reutilizar runtime y worker existente solo después de inventario OLD vs NEW, snapshot, tests y rollback. El Worker original actual rechaza HTTP y sólo procesa heartbeat, por lo que NO se debe abrir su entrada o mezclar ejecutar Notion sin gates.
- PASS solo con prueba negativa desde cliente no autorizado, firma válida, DB única, privilegio no escalable, coste y revocación probada.

## Gate 2 · Ejecutor y cola
- Código existente `notion-governed-operator.mjs` exige consentimiento de propiedad de página sintética, compare-and-swap e idempotencia, snapshot, audit append-only, GET post-write y reconciliación. Se han probado partes en SQLite / mock, NO por la ruta autónoma real.
- El registro D1 `fact001_notion_owned_children_v1` mantiene el fixture en `approved=0`; no activarlo por inferencia.
- Worker actual `fact001_runner_jobs_v1` sólo admite `fact001.lab.heartbeat` por CHECK; añadir tipos Notion exige migración aditiva paralela y rollback comprobado. No modificarlo in-place sin contrato.
- PASS: una orden firmada CEREBRO en LAB sintético, durable claim y audit reales, ninguna escritura duplicada tras reintento/concurrencia, limpieza del fixture, cola OFF/ON gates y observabilidad.

## Gate 3 · Workspace backup y promoción
- La identidad de servicio CEREBRO Notion está compartida con Wiki Fénix Capital. En ChatGPT Notion, la búsqueda autorizada de 'Fénix Capital' devuelve otras páginas adicionales. Por tanto, **la visibilidad del servicio no demuestra cobertura de todo el workspace**. Un backup integral requiere inventario de todas las páginas, bases, bloques, archivos y revisiones accesibles conforme a permisos; verificar la cobertura, export y prueba de restauración en espacio LAB.
- Antes de certificar PROD: snapshots independientes, permisos y legal, backup Notion completo, recovery drill, auditoría, rate limit, cuotas <=0 EUR adicional, logs sin secretos, rollback de Worker/Broker/DB, PREPROD cuando aplique o LAB paralelo para estos motores, gate de promoción y aprobación humana solo si HIGH_RISK/LEGAL_REQUIRED/etc.
- Mantener los controles globales de Notion en 6/11 y PARTIAL mientras los tres apartados anteriores no estén físicamente probados.

## Política permanente
CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. Prohibido tocar main, APP, CRM, DNS, PROD u otras D1 para completar este gate.
