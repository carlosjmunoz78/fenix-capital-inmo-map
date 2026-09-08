from __future__ import annotations
import json
import pathlib


def main() -> None:
    p = pathlib.Path('cerebro/factory/STATUS.md')
    s = p.read_text(encoding='utf-8')
    replacements = {
        "- PR #153 integró `KW-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3352 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Keyword Discovery V0: `3536800fe26272ed296f1b5dcf65de4df625d832`.":
        "- PR #153 integró `KW-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3352 terminó SUCCESS completo.\n- PR #155 integró `LOCALP-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3354 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Local Presence Audit V0: `80fb98397df556bff033be0b15a8892e55189384`.",
        "- Engine Registry actual: `0.17.0`.": "- Engine Registry actual: `0.18.0`.",
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `WAUD-001`, `KW-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 17 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.":
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `WAUD-001`, `KW-001`, `LOCALP-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 16 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.",
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 12 motores tienen V0.2 operativa PREPROD y 17 permanecen `DEFINED_NOT_BUILT`.":
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 13 motores tienen V0.2 operativa PREPROD y 16 permanecen `DEFINED_NOT_BUILT`.",
        "- **KW-001:** `CONFIRMED_OPERATIONAL_PREPROD_EVIDENCE_ONLY` V0.2; oportunidades/intents/clusters deterministas sin fabricar métricas externas y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**":
        "- **KW-001:** `CONFIRMED_OPERATIONAL_PREPROD_EVIDENCE_ONLY` V0.2; oportunidades/intents/clusters deterministas sin fabricar métricas externas y PROD DENY.\n- **LOCALP-001:** `CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY` V0.2; auditoría determinista de presencia local sin mutación de Google Business Profile y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**",
        "- **Engine Registry:** `0.17.0`, 46 IDs, sin duplicados conocidos.": "- **Engine Registry:** `0.18.0`, 46 IDs, sin duplicados conocidos.",
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3352 SUCCESS sobre `3536800fe26272ed296f1b5dcf65de4df625d832`.":
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3354 SUCCESS sobre `80fb98397df556bff033be0b15a8892e55189384`."
    }
    for old, new in replacements.items():
        if old not in s:
            raise SystemExit(f'missing STATUS fragment: {old[:120]}')
        s = s.replace(old, new)

    marker = '## HECHO / VERDE · CEREBRO CONSOLE CHAIN V0 PREPROD'
    section = """## HECHO / VERDE · LOCAL PRESENCE AUDIT V0 PREPROD
- `LOCALP-001` V0.2: `CONFIRMED_OPERATIONAL` en PREPROD como auditoría local determinista/read-only.
- Consume `BMD-001`, `SCAN-001`, hechos declarados y evidencia pública local fechada; `SEO-001` permanece como frontera SEO/local canónica.
- Audita NAP, categorías, servicios, cobertura geográfica y estado de evidencia de reviews.
- Rating/review_count nunca se fabrican: quedan `unknown_without_public_evidence` salvo evidencia pública explícita y fechada.
- No usa Google Business API, no pide credenciales, no muta Google Business Profile ni realiza escritura remota.
- Rechaza cruce de `company_id`, material sensible y ejecución PROD; coste adicional 0 € y sin IA obligatoria.
- FACT-001 preservó scaffold 0.1.0 y promovió `LOCALP-001` a 0.2.0; Registry global `0.18.0`; dependency map `0.8.0`.
- PR #155: Factory V0 #369 SUCCESS + App Compatibility #95 SUCCESS. Post-merge PREPROD #3354 / run `34245996516`: SUCCESS completo.
- Autonomía: `PREPROD_DETERMINISTIC_READ_ONLY_LOCAL_AUDIT`; PROD: `DENY`.
- Evidencia: `governance/localp-001-v0-closeout-2026-09-08.json`.

"""
    if '## HECHO / VERDE · LOCAL PRESENCE AUDIT V0 PREPROD' not in s:
        if marker not in s:
            raise SystemExit('console marker missing')
        s = s.replace(marker, section + marker)
    p.write_text(s, encoding='utf-8')

    evidence = {
        'date': '2026-09-08',
        'engine_id': 'LOCALP-001',
        'version': '0.2.0',
        'status': 'CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY',
        'pr': 155,
        'pr_head_sha': 'a809ccda5e9ec777f448b396a751d97fcd7665a5',
        'merge_sha': '80fb98397df556bff033be0b15a8892e55189384',
        'required_checks': {
            'FACT-001 Factory V0': {'run_id': 34244815245, 'run_number': 369, 'conclusion': 'SUCCESS'},
            'FACT-001 App Compatibility': {'run_id': 34244815247, 'run_number': 95, 'conclusion': 'SUCCESS'}
        },
        'post_merge_preprod': {'run_id': 34245996516, 'run_number': 3354, 'conclusion': 'SUCCESS'},
        'registry_version': '0.18.0',
        'dependency_map_version': '0.8.0',
        'wave1_implemented': 13,
        'wave1_defined_not_built': 16,
        'google_business_mutation': False,
        'fabricated_review_metrics': False,
        'additional_cost_eur': 0,
        'prod_autonomy': 'DENY',
        'prod_mutation': False
    }
    q = pathlib.Path('cerebro/factory/governance/localp-001-v0-closeout-2026-09-08.json')
    q.write_text(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
