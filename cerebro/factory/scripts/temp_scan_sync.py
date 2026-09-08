from __future__ import annotations
import json
import pathlib


def main() -> None:
    dep = pathlib.Path('cerebro/factory/contracts/dependency-map.json')
    d = json.loads(dep.read_text(encoding='utf-8'))
    d['map_version'] = '0.4.0'
    if not any(n.get('id') == 'SCAN-001' for n in d['nodes']):
        d['nodes'].append({'id':'SCAN-001','type':'engine'})
    for edge in [
        {'from':'SCAN-001','to':'COMP-REG-001','kind':'company domain metadata'},
        {'from':'SCAN-001','to':'WEB-001','kind':'canonical web boundary; no replacement'},
        {'from':'SCAN-001','to':'AUD-001','kind':'dated evidence contract'},
        {'from':'COMP-ONB-001','to':'SCAN-001','kind':'first onboarding discovery step; explicit orchestration only'},
    ]:
        if edge not in d['edges']:
            d['edges'].append(edge)
    risk = 'SCAN-001 V0 is public HTTP read-only and must not become an aggressive enumerator, credentialed scanner or remote writer'
    if risk not in d['known_risks']:
        d['known_risks'].append(risk)
    dep.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    ch = pathlib.Path('cerebro/factory/CHANGELOG.md')
    s = ch.read_text(encoding='utf-8')
    section = """## 0.4.5 · 2026-09-08
- Implementado `SCAN-001` V0.2 en runtime compartido PREPROD como Digital Footprint Scanner determinista y read-only.
- Inventario previo no encontró crawler/scanner equivalente en el repo; `WEB-001` se conserva como frontera web canónica y SCAN no lo sustituye.
- V0 inspecciona root HTML, `robots.txt`, `sitemap.xml`, señales tecnológicas y perfiles sociales públicos enlazados mediante fetcher inyectado.
- CI no depende de Internet: tests usan fetcher local falso; no polling, credenciales, brute force, enumeración agresiva ni escritura remota.
- Cada salida conserva `company_id`, dominio, timestamp de evidencia y SHA-256; coste adicional objetivo 0 €.
- FACT-001 promovió `SCAN-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.13.0 → 0.14.0.
- Dependency map avanza a 0.4.0 y declara `COMP-ONB → SCAN`, `SCAN → COMP-REG/WEB/AUD`.
- Backup/rebuild por Git+manifest+contrato; rollback por puntero versionado FACT-001. PROD autonomy `DENY`.
- Candidate y workflow temporal de promoción se retiran antes de PR. Sin Supabase PROD, WordPress, Cloudflare ni Trading REAL.

"""
    if '## 0.4.5 · 2026-09-08' not in s:
        s = s.replace('# FACT-001 Changelog\n\n', '# FACT-001 Changelog\n\n' + section)
    ch.write_text(s, encoding='utf-8')

    rb = pathlib.Path('cerebro/factory/RUNBOOK.md')
    r = rb.read_text(encoding='utf-8')
    section2 = """

## SCAN-001 · operación PREPROD read-only
`SCAN-001` V0.2 recopila únicamente señales HTTP públicas mediante un fetcher inyectado y no reemplaza `WEB-001`.

Reglas:
1. requiere `company_id`, dominio público válido y `evidence_at` explícito;
2. consulta root, `robots.txt` y `sitemap.xml` sin polling/reintentos automáticos;
3. extrae título/canonical signal, tecnologías heurísticas y perfiles sociales enlazados;
4. cada resultado incluye SHA-256 de evidencia y `external_cost_eur=0`;
5. no usa credenciales, no inicia sesión, no enumera agresivamente subdominios, no muta WordPress/Cloudflare ni ejecuta JavaScript remoto;
6. tests deben usar fetcher inyectado/local para que CI sea reproducible y no dependa de Internet;
7. PROD permanece DENY; una futura ampliación de alcance requiere contrato, rate limits, evaluación, tribunal y rollback propios.

Backup/rebuild: Git + manifest versionado + contrato/tests. Rollback: `version_engine.py rollback --engine-id SCAN-001 --to-version 0.1.0` tras `--plan` y OLD vs NEW.
"""
    if '## SCAN-001 · operación PREPROD read-only' not in r:
        r += section2
    rb.write_text(r, encoding='utf-8')


if __name__ == '__main__':
    main()
