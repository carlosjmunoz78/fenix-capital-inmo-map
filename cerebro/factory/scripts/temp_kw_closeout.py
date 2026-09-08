from __future__ import annotations
import json
import pathlib


def main() -> None:
    p = pathlib.Path('cerebro/factory/STATUS.md')
    s = p.read_text(encoding='utf-8')
    replacements = {
        "- PR #151 integró `WAUD-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3350 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Website Audit V0: `1793c70110e8c68b6b14dd30f7dc3929fe65bcee`.":
        "- PR #151 integró `WAUD-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3350 terminó SUCCESS completo.\n- PR #153 integró `KW-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3352 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Keyword Discovery V0: `3536800fe26272ed296f1b5dcf65de4df625d832`.",
        "- Engine Registry actual: `0.16.0`.": "- Engine Registry actual: `0.17.0`.",
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `WAUD-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 18 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.":
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `WAUD-001`, `KW-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 17 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.",
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 11 motores tienen V0.2 operativa PREPROD y 18 permanecen `DEFINED_NOT_BUILT`.":
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 12 motores tienen V0.2 operativa PREPROD y 17 permanecen `DEFINED_NOT_BUILT`.",
        "- **WAUD-001:** `CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY` V0.2; auditoría determinista de snapshots web sin mutación remota y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**":
        "- **WAUD-001:** `CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY` V0.2; auditoría determinista de snapshots web sin mutación remota y PROD DENY.\n- **KW-001:** `CONFIRMED_OPERATIONAL_PREPROD_EVIDENCE_ONLY` V0.2; oportunidades/intents/clusters deterministas sin fabricar métricas externas y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**",
        "- **Engine Registry:** `0.16.0`, 46 IDs, sin duplicados conocidos.": "- **Engine Registry:** `0.17.0`, 46 IDs, sin duplicados conocidos.",
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3350 SUCCESS sobre `1793c70110e8c68b6b14dd30f7dc3929fe65bcee`.":
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3352 SUCCESS sobre `3536800fe26272ed296f1b5dcf65de4df625d832`."
    }
    for old, new in replacements.items():
        if old not in s:
            raise SystemExit(f'missing STATUS fragment: {old[:120]}')
        s = s.replace(old, new)
    marker = '## HECHO / VERDE · CEREBRO CONSOLE CHAIN V0 PREPROD'
    section = """## HECHO / VERDE · KEYWORD DISCOVERY V0 PREPROD
- `KW-001` V0.2: `CONFIRMED_OPERATIONAL` en PREPROD como discovery determinista evidence-only.
- Consume `BMD-001`, `WAUD-001`, semillas declaradas y geografía explícita; `SEO-001` permanece como frontera SEO canónica.
- Genera oportunidades, intent, clusters y prioridad reproducible sin fabricar volumen, CPC, dificultad o ranking; esas métricas quedan `unknown_without_authorized_source`.
- Rechaza cruce de `company_id`, material sensible y ejecución PROD; coste adicional 0 € y sin IA obligatoria.
- FACT-001 preservó scaffold 0.1.0 y promovió `KW-001` a 0.2.0; Registry global `0.17.0`; dependency map `0.7.0`.
- PR #153: Factory V0 #359 SUCCESS + App Compatibility #93 SUCCESS. Post-merge PREPROD #3352 / run `34242434630`: SUCCESS completo.
- Autonomía: `PREPROD_DETERMINISTIC_EVIDENCE_ONLY`; PROD: `DENY`.
- Evidencia: `governance/kw-001-v0-closeout-2026-09-08.json`.

"""
    if '## HECHO / VERDE · KEYWORD DISCOVERY V0 PREPROD' not in s:
        if marker not in s:
            raise SystemExit('console marker missing')
        s = s.replace(marker, section + marker)
    p.write_text(s, encoding='utf-8')

    evidence = {
        'date': '2026-09-08',
        'engine_id': 'KW-001',
        'version': '0.2.0',
        'status': 'CONFIRMED_OPERATIONAL_PREPROD_EVIDENCE_ONLY',
        'pr': 153,
        'pr_head_sha': '4cebdb2c7871f0616d704b9cc62b657f63994dac',
        'merge_sha': '3536800fe26272ed296f1b5dcf65de4df625d832',
        'required_checks': {
            'FACT-001 Factory V0': {'run_id': 34237983708, 'run_number': 359, 'conclusion': 'SUCCESS'},
            'FACT-001 App Compatibility': {'run_id': 34237983610, 'run_number': 93, 'conclusion': 'SUCCESS'}
        },
        'post_merge_preprod': {'run_id': 34242434630, 'run_number': 3352, 'conclusion': 'SUCCESS'},
        'registry_version': '0.17.0',
        'dependency_map_version': '0.7.0',
        'wave1_implemented': 12,
        'wave1_defined_not_built': 17,
        'fabricated_metrics': False,
        'additional_cost_eur': 0,
        'prod_autonomy': 'DENY',
        'prod_mutation': False
    }
    q = pathlib.Path('cerebro/factory/governance/kw-001-v0-closeout-2026-09-08.json')
    q.write_text(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
