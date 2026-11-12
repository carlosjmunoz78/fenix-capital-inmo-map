# CEREBRO OS · Consola Operativa · conexión / actividad · 12 noviembre 2026

## HECHO · Evidencia de publicación
- Dominio: https://app.fenixcapital.es/cerebro?section=operativa
- Vercel alias `app.fenixcapital.es` sigue asociado a `dpl_7UN5uQemxyjndWdRwWyeBu2WfYr5` (verificado después de los cambios).
- Chat Gateway Supabase `cerebro-console-gateway-v0`: versión **34 ACTIVE**, regresión determinista de frase «CEREBRO, dime si estás conectado» reparada; lectura owner-only, conocimiento y otras rutas intactas. Contrato GH Actions **43249094847 SUCCESS**.
- Rollback exacto Gateway v33: rama `fix/cerebro-gateway-health-reply-20261112`, archivos `cerebro/rollback/cerebro-console-gateway-v33-20261112/{index.ts,knowledge.ts}`. El despliegue preservó `verify_jwt=false` de la función original, cuya autorización owner está en código `authorizedOwner`. No convertir en endpoint anónimo.
- Actividad Supabase `cerebro-console-activity-v0`: versión **7 ACTIVE**, `verify_jwt=true`, si no hay `GITHUB_TOKEN` consume exclusivamente fuente JSON pública generada con token efímero de GitHub Actions (sin exponer token).
- Rollback exacto actividad v6: rama `fix/cerebro-activity-snapshot-fallback-20261112`, ruta `cerebro/rollback/operativa-activity-v6-20261112/index.ts`.
- Contrato v7: GitHub Actions **43251350839 SUCCESS**. Función owner-only conserva `authorizedOwner`, CORS, GET-readonly, sin acceso de App/CRM ni cambios SQL.
- Primer feed real generado por workflow **43251913305 SUCCESS**; rama exclusiva `cerebro-activity-feed-v1`, archivo `activity.json`, formato `cerebro-actions-feed-v1` y marca de lectura. El workflow fue incorporado a `main` con PR **#48** (SHA squash `658ce924075208492b335108ca968b0506ae947b`), sin editar código de App.
- Primera lectura autenticada: 2026-11-12 15:49:30 UTC: 2 ejecuciones en curso y 26 en cola **en todo el repositorio**, con subset CEREBRO de 1 ejecución en curso y 8 en cola y 24 recientes. No presentar totales globales como si fueran todos motores CEREBRO.
- Tras desplegar actividad v7: Supabase registró HTTP 200 a las 15:50:36, 15:51:05 y 15:51:35 UTC del 12-11-2026, frente a 503 previos. Aún no demuestra estabilidad 24 h.
- 5 minutos de intervalo objetivo en GitHub Actions (puede retrasarse por GitHub). Fuente en Operativa `source_status=CACHED`, `observed_at` conserva la fecha física de la generación; si antigüedad supera 20 minutos, **503 no verificable** (fail-closed). La palabra «directo» no significa streaming.

## Parcial / por auditar
- Opera Browser Connector devolvió timeout: no se ha realizado E2E físico del nuevo mensaje ni micrófono en la sesión de propietario. Usuario puede probarlos en la App.
- Multiempresa AION/CAPTACASA continúa bloqueada por ausencia de autorizaciones tenant en backend. No confundir con funcionalidad completa.
- Voz navegador STT/TTS de prueba sin modelo de pago ni JARVIS V2; permiso de micro pendiente de prueba real.
- El Gateway conversacional es determinista y limitado: recibir un mensaje no equivale a ofrecer IA general ni autonomía de todos los motores.

## Coste y perímetro
- Repo GitHub público; Actions usa runner estándar `ubuntu-latest` y `GITHUB_TOKEN` efímero. No se contrataron planes ni trasladaron credenciales al cliente.
- No se han modificado App, CRM, trading, DNS, WordPress, ANAs o JARVIS V2.
- Tokens GitHub nunca se incluyen en el JSON público, logs ni UI.
- El snapshot publica solo metadatos de ejecuciones de un repositorio **público**; no incluir datos de clientes ni argumentos privados.

## Backup y rollback
1. Para la actividad, desplegar el `index.ts` exacto v6 indicado (verificar SHA) con nombre `cerebro-console-activity-v0` y `verify_jwt=true`.
2. Para el chat, restaurar **ambos** archivos de Gateway v33 `index.ts` y `knowledge.ts` y mantener la configuración de autorización original de la función.
3. Si el feed no publica, deshabilitar el workflow `CEREBRO Activity · Authenticated GitHub metadata feed` o revertir PR #48; no tocar la App ni la rama `gh-pages`.
4. Verificar GET 200 autenticado, sello temporal menor de 20 min y contraste de totales con GitHub. Toda anomalía se declara NO VERIFICABLE, no éxito.
