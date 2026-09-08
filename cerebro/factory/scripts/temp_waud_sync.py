from __future__ import annotations
import json
import pathlib


def main() -> None:
    dep = pathlib.Path('cerebro/factory/contracts/dependency-map.json')
    d = json.loads(dep.read_text(encoding='utf-8'))
    d['map_version'] = '0.6.0'
    if not any(n.get('id') == 'WAUD-001' for n in d['nodes']):
        d['nodes'].append({'id': 'WAUD-001', 'type': 'engine'})
    for edge in [
        {'from': 'WAUD-001', 'to': 'BMD-001', 'kind': 'business-model context'},
        {'from': 'WAUD-001', 'to': 'SCAN-001', 'kind': 'public footprint evidence'},
        {'from': 'WAUD-001', 'to': 'WEB-001', 'kind': 'canonical public web boundary'},
        {'from': 'WAUD-001', 'to': 'SEO-001', 'kind': 'canonical SEO boundary'},
        {'from': 'COMP-ONB-001', 'to': 'WAUD-001', 'kind': 'dependency-valid website audit step; explicit orchestration only'},
    ]:
        if edge not in d['edges']:
            d['edges'].append(edge)
    risk = 'WAUD-001 V0 is deterministic read-only snapshot analysis and must not mutate remote websites, tracking, forms or SEO configuration'
    if risk not in d['known_risks']:
        d['known_risks'].append(risk)
    dep.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    ch = pathlib.Path('cerebro/factory/CHANGELOG.md')
    s = ch.read_text(encoding='utf-8')
    section = """## 0.4.7 · 2026-09-08
- Implementado `WAUD-001` V0.2 en runtime compartido PREPROD como Website Audit determinista y read-only.
- Reutiliza `WEB-001` como frontera web canónica, `SCAN-001` como evidencia pública, `BMD-001` como contexto de negocio y `SEO-001` como frontera SEO; no duplica crawler ni muta WordPress/Cloudflare/SEO.
- Evalúa señales técnicas y de conversión sobre snapshots normalizados: HTTP, title, meta description, canonical, H1, lang, viewport, formularios, tracking e imágenes.
- Rechaza cruces de `company_id`, material sensible y ejecución PROD; no usa credenciales, no realiza login y no escribe remotamente.
- FACT-001 promovió `WAUD-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.15.0 → 0.16.0.
- Dependency map avanza a 0.6.0; la ejecución de onboarding sigue el grafo Factory `SCAN → BMD → WAUD → KW` hasta reconciliación explícita de la secuencia textual.
- Backup/rebuild por Git+manifest+replay de snapshots; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

"""
    if '## 0.4.7 · 2026-09-08' not in s:
        s = s.replace('# FACT-001 Changelog\n\n', '# FACT-001 Changelog\n\n' + section)
    ch.write_text(s, encoding='utf-8')

    rb = pathlib.Path('cerebro/factory/RUNBOOK.md')
    r = rb.read_text(encoding='utf-8')
    section2 = """

## WAUD-001 · operación PREPROD determinista read-only
`WAUD-001` V0.2 analiza snapshots públicos normalizados y produce hallazgos reproducibles sin escribir en la web ni sustituir `WEB-001`/`SEO-001`.

Reglas:
1. requiere `company_id`, evidencia `SCAN-001`, perfil `BMD-001`, snapshot público normalizado y `evidence_at`;
2. sólo analiza contenido recibido; V0 no hace login, crawling agresivo, purge, cambio SEO, tracking ni formularios;
3. hallazgos cubren HTTP, metadatos, canonical, H1, idioma, viewport, formularios, tracking e imágenes;
4. cruce multiempresa y material sensible se rechazan deny-by-default;
5. `environment=PROD` está bloqueado; toda mutación remota permanece fuera del contrato;
6. coste adicional 0 €, Python stdlib, sin IA obligatoria ni servidor nuevo;
7. siguiente dependencia por grafo Factory tras WAUD es `KW-001`.

Backup/rebuild: Git + manifest versionado + replay de snapshots/evidencia. Rollback: `version_engine.py rollback --engine-id WAUD-001 --to-version 0.1.0` tras `--plan`, OLD vs NEW y gates.
"""
    if '## WAUD-001 · operación PREPROD determinista read-only' not in r:
        r += section2
    rb.write_text(r, encoding='utf-8')


if __name__ == '__main__':
    main()
