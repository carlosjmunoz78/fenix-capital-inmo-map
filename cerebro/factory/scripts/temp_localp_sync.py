from __future__ import annotations
import json
import pathlib


def main() -> None:
    dep = pathlib.Path('cerebro/factory/contracts/dependency-map.json')
    d = json.loads(dep.read_text(encoding='utf-8'))
    d['map_version'] = '0.8.0'
    if not any(n.get('id') == 'LOCALP-001' for n in d['nodes']):
        d['nodes'].append({'id': 'LOCALP-001', 'type': 'engine'})
    for edge in [
        {'from': 'LOCALP-001', 'to': 'BMD-001', 'kind': 'business-model evidence'},
        {'from': 'LOCALP-001', 'to': 'SCAN-001', 'kind': 'public footprint evidence'},
        {'from': 'LOCALP-001', 'to': 'SEO-001', 'kind': 'canonical SEO/local boundary'},
        {'from': 'COMP-ONB-001', 'to': 'LOCALP-001', 'kind': 'dependency-valid local presence step; explicit orchestration only'},
    ]:
        if edge not in d['edges']:
            d['edges'].append(edge)
    risk = 'LOCALP-001 V0 must not mutate Google Business Profile or fabricate ratings/review counts without dated public evidence'
    if risk not in d['known_risks']:
        d['known_risks'].append(risk)
    dep.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    ch = pathlib.Path('cerebro/factory/CHANGELOG.md')
    s = ch.read_text(encoding='utf-8')
    section = """## 0.4.9 · 2026-09-08
- Implementado `LOCALP-001` V0.2 en runtime compartido PREPROD como auditoría local determinista y read-only.
- Consume `BMD-001`, `SCAN-001`, hechos declarados y evidencia pública local fechada; `SEO-001` se preserva como frontera SEO/local canónica.
- Audita NAP, categorías, servicios, cobertura geográfica y estado de evidencia de reviews; rating/review_count quedan desconocidos si no existe evidencia pública válida.
- No accede ni muta Google Business Profile, no usa credenciales, no escribe remotamente y no requiere IA de pago.
- FACT-001 promovió `LOCALP-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.17.0 → 0.18.0.
- Dependency map avanza a 0.8.0; LOCALP desbloquea dependencias de COMPET/SEOBOOT sin declarar esos motores operativos.
- Backup/rebuild por Git+manifest+replay de evidencia; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

"""
    if '## 0.4.9 · 2026-09-08' not in s:
        s = s.replace('# FACT-001 Changelog\n\n', '# FACT-001 Changelog\n\n' + section)
    ch.write_text(s, encoding='utf-8')

    rb = pathlib.Path('cerebro/factory/RUNBOOK.md')
    r = rb.read_text(encoding='utf-8')
    section2 = """

## LOCALP-001 · operación PREPROD determinista read-only
`LOCALP-001` V0.2 audita presencia local únicamente desde hechos declarados y evidencia pública fechada.

Reglas:
1. requiere `company_id`, perfil `BMD-001`, evidencia `SCAN-001`, hechos NAP/categorías/servicios/cobertura declarados y `evidence_at`;
2. evidencia pública local es opcional y nunca autoriza escrituras;
3. rating/review_count sólo se registran si están explícitamente presentes y tipados en evidencia pública; en caso contrario quedan `unknown_without_public_evidence`;
4. cruce multiempresa y material sensible se rechazan deny-by-default;
5. `environment=PROD` está bloqueado; V0 no usa Google Business API ni credenciales;
6. coste adicional 0 €, Python stdlib, sin IA obligatoria ni servidor nuevo;
7. el siguiente desbloqueo estructural relevante es `COMPET-001`, que aún depende también de `SOCAUD-001`.

Backup/rebuild: Git + manifest versionado + replay de evidencia. Rollback: `version_engine.py rollback --engine-id LOCALP-001 --to-version 0.1.0` tras `--plan`, OLD vs NEW y gates.
"""
    if '## LOCALP-001 · operación PREPROD determinista read-only' not in r:
        r += section2
    rb.write_text(r, encoding='utf-8')


if __name__ == '__main__':
    main()
