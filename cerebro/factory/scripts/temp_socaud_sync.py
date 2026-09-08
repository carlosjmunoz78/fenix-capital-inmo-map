from __future__ import annotations
import json
import pathlib


def main() -> None:
    dep = pathlib.Path('cerebro/factory/contracts/dependency-map.json')
    d = json.loads(dep.read_text(encoding='utf-8'))
    d['map_version'] = '0.9.0'
    if not any(n.get('id') == 'SOCAUD-001' for n in d['nodes']):
        d['nodes'].append({'id': 'SOCAUD-001', 'type': 'engine'})
    for edge in [
        {'from': 'SOCAUD-001', 'to': 'AUD-001', 'kind': 'audit/governance boundary'},
        {'from': 'SOCAUD-001', 'to': 'BMD-001', 'kind': 'business-model evidence'},
        {'from': 'SOCAUD-001', 'to': 'SCAN-001', 'kind': 'public social footprint evidence'},
        {'from': 'COMP-ONB-001', 'to': 'SOCAUD-001', 'kind': 'dependency-valid social audit step; explicit orchestration only'},
    ]:
        if edge not in d['edges']:
            d['edges'].append(edge)
    risk = 'SOCAUD-001 V0 must not login, publish, message, use private social APIs or fabricate audience metrics without public dated evidence'
    if risk not in d['known_risks']:
        d['known_risks'].append(risk)
    dep.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    ch = pathlib.Path('cerebro/factory/CHANGELOG.md')
    s = ch.read_text(encoding='utf-8')
    section = """## 0.4.10 · 2026-09-08
- Implementado `SOCAUD-001` V0.2 en runtime compartido PREPROD como auditoría social determinista y pública/read-only.
- Consume `AUD-001`, `BMD-001`, `SCAN-001` y evidencia social pública fechada; no usa login, credenciales ni APIs privadas.
- Audita perfiles observados, formatos, cobertura y cadencia únicamente con timestamps suficientes; seguidores y otras señales sólo se aceptan si están explícitamente presentes en evidencia pública.
- No publica, no envía mensajes, no escribe remotamente y no fabrica alcance, engagement, audiencia, seguidores ni cadencia.
- FACT-001 promovió `SOCAUD-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.18.0 → 0.19.0.
- Dependency map avanza a 0.9.0; con SOCAUD + LOCALP + KW + WAUD + SCAN se desbloquea el contrato de `COMPET-001`.
- Backup/rebuild por Git+manifest+replay de evidencia; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

"""
    if '## 0.4.10 · 2026-09-08' not in s:
        s = s.replace('# FACT-001 Changelog\n\n', '# FACT-001 Changelog\n\n' + section)
    ch.write_text(s, encoding='utf-8')

    rb = pathlib.Path('cerebro/factory/RUNBOOK.md')
    r = rb.read_text(encoding='utf-8')
    section2 = """

## SOCAUD-001 · operación PREPROD determinista pública/read-only
`SOCAUD-001` V0.2 audita presencia social únicamente desde evidencia pública y declarativa.

Reglas:
1. requiere `company_id`, perfil `BMD-001`, huella `SCAN-001` y `evidence_at`;
2. evidencia social pública es opcional y nunca autoriza login, publicación, mensajería ni escritura;
3. cadencia sólo se calcula con al menos dos publicaciones públicas fechadas; audiencia/seguidores nunca se estiman;
4. cruce multiempresa y material sensible se rechazan deny-by-default;
5. `environment=PROD` está bloqueado; no existen credenciales ni private API path en V0;
6. coste adicional 0 €, Python stdlib, sin IA obligatoria ni servidor nuevo;
7. `COMPET-001` puede construirse después de este gate porque sus dependencias públicas quedan cubiertas.

Backup/rebuild: Git + manifest versionado + replay de evidencia. Rollback: `version_engine.py rollback --engine-id SOCAUD-001 --to-version 0.1.0` tras `--plan`, OLD vs NEW y gates.
"""
    if '## SOCAUD-001 · operación PREPROD determinista pública/read-only' not in r:
        r += section2
    rb.write_text(r, encoding='utf-8')


if __name__ == '__main__':
    main()
