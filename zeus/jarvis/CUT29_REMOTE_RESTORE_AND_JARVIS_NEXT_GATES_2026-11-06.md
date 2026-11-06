# JARVIS · CUT29 · VERIFICACIÓN DE PERSISTENCIA REMOTA Y CONTINUIDAD

**Fecha 2026-11-06 · PR #25 DRAFT · LAB HECHO · PROD NO-GO.**

## Evidencia verificada
Work aplicó migraciones SQL 0001–0005 en Cloudflare D1 EU `cerebro-jarvis-lab-eu` (UUID `988b11e1-21aa-4cf9-8b9d-110319df7ccc`). Work informó de 7 tablas, 5 índices, 4 triggers y cero filas de usuario. Exportó `baseline.sql`, `post-migration.sql` y dos esquemas JSON; restauró separadamente en `cerebro-jarvis-lab-eu-restore-cut29` (UUID `c446f17c-c26d-4c76-a3ea-f62c843d461b`, jurisdicción EU y replicación deshabilitada). La base antigua `cerebro-jarvis-lab-cut21` permanece protegida. Todo sin token nuevo y en Workers Free (0 USD de suscripción adicional).

**Inspección independiente en este chat:** abierto ZIP de Biblioteca `libfile_69800515e3ec8191a8f079eabf4f5158`; `ZipFile.testzip()` íntegro, hashes SHA256SUMS correctos, `source-schema.json` igual exactamente a `restore-schema.json`, 7 TABLE / 5 INDEX / 4 TRIGGER, ausencia de datos de usuarios declarada. SHA256 del ZIP completo `35447ab4e80f4cb6b2fb659bfdf42250c3a9e549616cd4706d5d3acbfae1264e`. Se confirmó además en Opera autenticado que la base D1 de recuperación existe con jurisdicción UE y que SQL Studio muestra las tablas.

**Límite fundamental:** copia y restauración son *SQL lógico del esquema sin filas de usuario*, NO snapshot de toda la plataforma ni prueba de recuperación de sesiones reales, RLS PostgreSQL o continuidad de Gateway.

## Entornos en lenguaje humano
- LAB: pruebas aisladas con identidades sintéticas, sin clientes ni escrituras PROD; estas 2 bases EU viven aquí.
- PREPROD: gate de comportamiento equivalente a producción (OLD vs NEW, adversarial, recuperación, reversión, coste). **No crear ni restaurar una App PREPROD separada**; ese entorno de App fue cancelado. PREPROD de motores puede ser una evaluación aislada/efímera y no invasiva, con nombre y evidencias propios.
- PROD: cuando JARVIS atienda al propietario y ejecute trabajo real de Fénix, bajo permisos y observabilidad, gradual y reversible. CI verde ≠ PROD autorizado.

## Camino técnico inmediato al uso real
1. **B2 e identidad:** registrar OWNER_ROOT legítimo usando canal ya consentido, sin copiar JWT ni contraseñas a chat/logs/repositorio. Secrets en Vault/cloud server-only, sesiones HMAC de duración controlada y revocación real en nueva D1 EU. No tocar App/CRM PROD.
2. **B3 mínima:** permiso `MISSION_INSPECT` exclusivamente para identidad autenticada, compañía y LAB, con control de gasto cero, auditoría de allow/deny, kill switch; no permisos de escritura/execution.
3. **Gateway paralelo:** despliegue LAB aislado detrás de la misma composición B2+B3 con tasa/límite coste, sin rutas a `app.fenixcapital.es`, rollback y backup antes de activar. Worker OFF hasta pruebas.
4. **Física:** dos sesiones verdaderas móvil/PC (NO dos JWT sintéticos), leer la misma misión cloud, reiniciar cliente sin pérdida, revocar una sin afectar la otra, pruebas negativas multiempresa, backups/rebuild.
5. **Tribunal B10 y OLD vs NEW:** contrato, protección de datos, coste real, observabilidad, seguridad, dependencia mínima, rollback probado, firma y/o HUMAN_REQUIRED según política. Solo después promoción gradual explícita a PROD.

## DeepSeek y aprendizaje posterior
**Dejar DEFINIDO, no activar ni gastar hoy.** Modelo externo de pago ya contratado por usuario: DeepSeek API, presupuesto de crédito disponible declarado 50 €. Objetivo temporal: mejorar conversación y conocimiento de JARVIS y reducir dependencia de pagos a largo plazo. Usa el Model Router existente, no 150 servidores ni un sistema de memoria paralelo en Supabase.

Protocolo futuro: **candidato → crítico → árbitro/evaluación → registro de conocimiento versionado → tests → tribunal → promoción controlada**. No conversaciones infinitas entre modelos, ni aceptar automáticamente afirmaciones externas como conocimiento verdadero, ni entrenar sobre datos confidenciales sin autorización y política de datos. Los casos de evaluación deben incluir español natural, expresiones cortas/erratas, dictado, continuidad multi-dispositivo, claridad y derecho a pedir humano.

**Nombres API vigentes según docs DeepSeek 2026-11-06:** `deepseek-flash` para tareas ordinarias y `deepseek-v4-pro` para críticas justificadas; evitar los `deepseek-chat`/`deepseek-reasoner` discontinuados. Imponer límite real de 50 € como máximo acumulado autorizado, SIN recarga automática, ledger por company_id/engine_id/environment/version/model/tokens, gastos previstos y confirmados, margen ante divisas USD/EUR, parada si API 402/MONEY_LIMIT. Confirmar saldo efectivo y credencial en Vault antes de primera llamada. No suponer que el saldo de la API ya está conectado o disponible desde JARVIS.

Docs: https://api-docs.deepseek.com/quick_start/pricing/ y https://api-docs.deepseek.com/updates/

## Sin tocar
App real, CRM, Supabase, DNS, ANA, Trading, WordPress, ramas main, Cloudflare Workers existentes, PR #25 (se mantiene DRAFT). No borrar ninguna de las D1.
