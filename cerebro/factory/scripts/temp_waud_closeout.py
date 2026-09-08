from __future__ import annotations
import json
import pathlib


def main() -> None:
    p = pathlib.Path('cerebro/factory/STATUS.md')
    s = p.read_text(encoding='utf-8')
    replacements = {
        "- PR #149 integró `BMD-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3348 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Business Model Discovery V0: `a00e72e87ca2063673919b6d88cf74fefbf4c93c`.":
        "- PR #149 integró `BMD-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3348 terminó SUCCESS completo.\n- PR #151 integró `WAUD-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3350 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Website Audit V0: `1793c70110e8c68b6b14dd30f7dc3929fe65bcee`.",
        "- Engine Registry actual: `0.15.0`.": "- Engine Registry actual: `0.16.0`.",
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 19 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.":
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `WAUD-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 18 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.",
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 10 motores tienen V0.2 operativa PREPROD y 19 permanecen `DEFINED_NOT_BUILT`.":
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 11 motores tienen V0.2 operativa PREPROD y 18 permanecen `DEFINED_NOT_BUILT`.",
        "- **BMD-001:** `CONFIRMED_OPERATIONAL_PREPROD` V0.2; ensamblaje determinista de modelo de negocio con `LOW_CONFIDENCE` ante evidencia insuficiente y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**":
        "- **BMD-001:** `CONFIRMED_OPERATIONAL_PREPROD` V0.2; ensamblaje determinista de modelo de negocio con `LOW_CONFIDENCE` ante evidencia insuficiente y PROD DENY.\n- **WAUD-001:** `CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY` V0.2; auditoría determinista de snapshots web sin mutación remota y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**",
        "- **Engine Registry:** `0.15.0`, 46 IDs, sin duplicados conocidos.": "- **Engine Registry:** `0.16.0`, 46 IDs, sin duplicados conocidos.",
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3348 SUCCESS sobre `a00e72e87ca2063673919b6d88cf74fefbf4c93c`.":
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3350 SUCCESS sobre `1793c70110e8c68b6b14dd30f7dc3929fe65bcee`.",
        "- **Siguiente acción estructural planificada:** implementar `WAUD-001` en PREPROD sobre `BMD-001 + SCAN-001 + WEB-001`; después `KW-001`, siguiendo el grafo Factory hasta reconciliar la secuencia textual de onboarding.":
        "- **Siguiente acción estructural planificada:** implementar `KW-001` en PREPROD sobre `BMD-001 + WAUD-001 + SEO-001`, siguiendo el grafo Factory y manteniendo coste adicional 0 €."
    }
    for old, new in replacements.items():
        if old not in s:
            raise SystemExit(f'missing STATUS fragment: {old[:120]}')
        s = s.replace(old, new)
    marker = '## HECHO / VERDE · CEREBRO CONSOLE CHAIN V0 PREPROD'
    section = """## HECHO / VERDE · WEBSITE AUDIT V0 PREPROD
- `WAUD-001` V0.2: `CONFIRMED_OPERATIONAL` en PREPROD como auditor determinista/read-only de snapshots web normalizados.
- Reutiliza `WEB-001`, `SCAN-001`, `BMD-001` y `SEO-001`; no duplica crawler ni sustituye fronteras existentes.
- Evalúa HTTP, title, meta description, canonical, H1, lang, viewport, formularios, tracking e imágenes sin login ni escritura remota.
- Rechaza cruce de `company_id`, material sensible y cualquier ejecución PROD; coste adicional 0 € y sin IA obligatoria.
- FACT-001 preservó scaffold 0.1.0 y promovió `WAUD-001` a 0.2.0; Registry global `0.16.0`; dependency map `0.6.0`.
- PR #151: Factory V0 #348 SUCCESS + App Compatibility #91 SUCCESS. Post-merge PREPROD #3350 / run `34236072077`: SUCCESS completo.
- La discrepancia textual de onboarding permanece documentada; ejecución sigue `SCAN → BMD → WAUD → KW` hasta reconciliación explícita.
- Autonomía: `PREPROD_DETERMINISTIC_READ_ONLY_AUDIT`; PROD: `DENY`.
- Evidencia: `governance/waud-001-v0-closeout-2026-09-08.json`.

"""
    if '## HECHO / VERDE · WEBSITE AUDIT V0 PREPROD' not in s:
        if marker not in s:
            raise SystemExit('console marker missing')
        s = s.replace(marker, section + marker)
    p.write_text(s, encoding='utf-8')

    evidence = {
        'date': '2026-09-08',
        'engine_id': 'WAUD-001',
        'version': '0.2.0',
        'status': 'CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY',
        'pr': 151,
        'pr_head_sha': 'd9bfedd765f29d79f2d69cfda8ec9dc6ebe51582',
        'merge_sha': '1793c70110e8c68b6b14dd30f7dc3929fe65bcee',
        'required_checks': {
            'FACT-001 Factory V0': {'run_id': 34235596173, 'run_number': 348, 'conclusion': 'SUCCESS'},
            'FACT-001 App Compatibility': {'run_id': 34235596036, 'run_number': 91, 'conclusion': 'SUCCESS'}
        },
        'post_merge_preprod': {'run_id': 34236072077, 'run_number': 3350, 'conclusion': 'SUCCESS'},
        'registry_version': '0.16.0',
        'dependency_map_version': '0.6.0',
        'wave1_implemented': 11,
        'wave1_defined_not_built': 18,
        'remote_write': False,
        'additional_cost_eur': 0,
        'prod_autonomy': 'DENY',
        'prod_mutation': False,
        'next_engine_by_dependency': 'KW-001'
    }
    q = pathlib.Path('cerebro/factory/governance/waud-001-v0-closeout-2026-09-08.json')
    q.write_text(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
