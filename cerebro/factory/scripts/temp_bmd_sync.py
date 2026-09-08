from __future__ import annotations
import json
import pathlib


def main() -> None:
    dep = pathlib.Path('cerebro/factory/contracts/dependency-map.json')
    d = json.loads(dep.read_text(encoding='utf-8'))
    d['map_version'] = '0.5.0'
    if not any(n.get('id') == 'BMD-001' for n in d['nodes']):
        d['nodes'].append({'id': 'BMD-001', 'type': 'engine'})
    for edge in [
        {'from': 'BMD-001', 'to': 'COMP-REG-001', 'kind': 'canonical company identity/geography'},
        {'from': 'BMD-001', 'to': 'SCAN-001', 'kind': 'public footprint evidence'},
        {'from': 'COMP-ONB-001', 'to': 'BMD-001', 'kind': 'dependency-valid discovery step; explicit orchestration only'},
    ]:
        if edge not in d['edges']:
            d['edges'].append(edge)
    risk = 'BMD-001 V0 must not invent missing business facts; LOW_CONFIDENCE is required when critical dimensions lack evidence'
    if risk not in d['known_risks']:
        d['known_risks'].append(risk)
    dep.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    ch = pathlib.Path('cerebro/factory/CHANGELOG.md')
    s = ch.read_text(encoding='utf-8')
    section = """## 0.4.6 · 2026-09-08
- Implementado `BMD-001` V0.2 en runtime compartido PREPROD como Business Model Discovery determinista basado en evidencia.
- Consume identidad/geografía canónica de `COMP-REG-001`, evidencia pública de `SCAN-001` y hechos empresariales explícitamente declarados.
- V0 no inventa servicios, productos, clientes, canales, propuesta de valor ni restricciones ausentes; cuando faltan dimensiones críticas devuelve `LOW_CONFIDENCE`.
- Rechaza cruce de `company_id`, material sensible y cualquier intento de ejecución PROD; no requiere IA de pago ni infraestructura nueva.
- FACT-001 promovió `BMD-001` 0.1.0 → 0.2.0 preservando scaffold inmutable; Engine Registry avanza 0.14.0 → 0.15.0.
- Dependency map avanza a 0.5.0 y declara `COMP-ONB → BMD`, `BMD → COMP-REG/SCAN`.
- Se conserva/documenta la discrepancia de orden: el texto de onboarding pone KW/WAUD antes de BMD, pero el grafo Factory exige BMD antes de WAUD/KW; ejecución sigue el grafo hasta reconciliación explícita.
- Backup/rebuild por Git+manifest+evidencia reproducible; rollback por puntero versionado FACT-001. Coste adicional 0 €. PROD autonomy `DENY`.

"""
    if '## 0.4.6 · 2026-09-08' not in s:
        s = s.replace('# FACT-001 Changelog\n\n', '# FACT-001 Changelog\n\n' + section)
    ch.write_text(s, encoding='utf-8')

    rb = pathlib.Path('cerebro/factory/RUNBOOK.md')
    r = rb.read_text(encoding='utf-8')
    section2 = """

## BMD-001 · operación PREPROD determinista
`BMD-001` V0.2 ensambla un perfil de modelo de negocio desde evidencia canónica/pública/declarada y nunca completa huecos por inferencia silenciosa.

Reglas:
1. requiere `company_id`, evidencia `SCAN-001`, hechos declarados y `evidence_at`;
2. identidad/geografía provienen de `COMP-REG-001`; señales públicas provienen de `SCAN-001`;
3. servicios/productos/clientes/value proposition/geografía/canales/objetivos/restricciones sólo se emiten si hay evidencia correspondiente;
4. si faltan dimensiones críticas, devuelve `LOW_CONFIDENCE` con lista explícita de campos faltantes;
5. rechazo deny-by-default para cruce multiempresa, secretos/material sensible y `environment=PROD`;
6. coste adicional 0 €, Python stdlib, sin IA obligatoria ni nuevo servidor;
7. la secuencia operativa sigue dependencias Factory: `SCAN → BMD → WAUD → KW` mientras la discrepancia textual de COMP-ONB permanezca sin reconciliar.

Backup/rebuild: Git + manifest versionado + replay de evidencia. Rollback: `version_engine.py rollback --engine-id BMD-001 --to-version 0.1.0` tras `--plan`, OLD vs NEW y gates.
"""
    if '## BMD-001 · operación PREPROD determinista' not in r:
        r += section2
    rb.write_text(r, encoding='utf-8')


if __name__ == '__main__':
    main()
