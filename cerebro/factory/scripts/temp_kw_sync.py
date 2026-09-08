from __future__ import annotations
import json
import pathlib


def main() -> None:
    dep = pathlib.Path('cerebro/factory/contracts/dependency-map.json')
    d = json.loads(dep.read_text(encoding='utf-8'))
    d['map_version'] = '0.7.0'
    if not any(n.get('id') == 'KW-001' for n in d['nodes']):
        d['nodes'].append({'id': 'KW-001', 'type': 'engine'})
    for edge in [
        {'from': 'KW-001', 'to': 'BMD-001', 'kind': 'business-model evidence'},
        {'from': 'KW-001', 'to': 'WAUD-001', 'kind': 'website audit evidence'},
        {'from': 'KW-001', 'to': 'SEO-001', 'kind': 'canonical SEO boundary'},
        {'from': 'COMP-ONB-001', 'to': 'KW-001', 'kind': 'dependency-valid keyword discovery step; explicit orchestration only'},
    ]:
        if edge not in d['edges']:
            d['edges'].append(edge)
    risk = 'KW-001 V0 must never fabricate search volume, CPC, ranking or keyword difficulty when no authorized external source is present'
    if risk not in d['known_risks']:
        d['known_risks'].append(risk)
    dep.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    ch = pathlib.Path('cerebro/factory/CHANGELOG.md')
    s = ch.read_text(encoding='utf-8')
    section = """## 0.4.8 · 2026-09-08
- Implementado `KW-001` V0.2 en runtime compartido PREPROD como Keyword Discovery determinista y evidence-only.
- Consume `BMD-001`, `WAUD-001`, semillas declaradas y geografía explícita; `SEO-001` se preserva como frontera SEO canónica.
- Genera oportunidades, intent, clusters y prioridad reproducible; volumen, CPC, dificultad y ranking permanecen `unknown_without_authorized_source` en ausencia de fuente autorizada.
- Rechaza cruces de `company_id`, material sensible y ejecución PROD; no realiza escritura remota ni requiere IA de pago.
- FACT-001 promovió `KW-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.16.0 → 0.17.0.
- Dependency map avanza a 0.7.0; `SCAN → BMD → WAUD → KW` queda ahora implementado en PREPROD por el grafo Factory.
- Backup/rebuild por Git+manifest+replay de evidencia; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

"""
    if '## 0.4.8 · 2026-09-08' not in s:
        s = s.replace('# FACT-001 Changelog\n\n', '# FACT-001 Changelog\n\n' + section)
    ch.write_text(s, encoding='utf-8')

    rb = pathlib.Path('cerebro/factory/RUNBOOK.md')
    r = rb.read_text(encoding='utf-8')
    section2 = """

## KW-001 · operación PREPROD determinista evidence-only
`KW-001` V0.2 genera oportunidades de palabra clave únicamente desde evidencia BMD/WAUD y semillas/geografía declaradas.

Reglas:
1. requiere `company_id`, perfil `BMD-001`, resultado `WAUD-001` y `evidence_at`;
2. semillas declaradas y ubicaciones explícitas pueden ampliar combinaciones sin convertirlas en métricas externas;
3. volumen, CPC, dificultad y ranking nunca se estiman silenciosamente: quedan `unknown_without_authorized_source`;
4. cruce multiempresa y material sensible se rechazan deny-by-default;
5. `environment=PROD` está bloqueado y no existe escritura remota;
6. coste adicional 0 €, Python stdlib, sin IA obligatoria ni servidor nuevo;
7. la futura incorporación de Search Console/SEO tools exige contrato separado y no debe alterar este baseline determinista.

Backup/rebuild: Git + manifest versionado + replay de evidencia. Rollback: `version_engine.py rollback --engine-id KW-001 --to-version 0.1.0` tras `--plan`, OLD vs NEW y gates.
"""
    if '## KW-001 · operación PREPROD determinista evidence-only' not in r:
        r += section2
    rb.write_text(r, encoding='utf-8')


if __name__ == '__main__':
    main()
