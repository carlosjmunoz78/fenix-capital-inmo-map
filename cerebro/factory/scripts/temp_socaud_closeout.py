from __future__ import annotations
import json
import pathlib


def main() -> None:
    p = pathlib.Path('cerebro/factory/STATUS.md')
    s = p.read_text(encoding='utf-8')
    replacements = {
        "- PR #155 integró `LOCALP-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3354 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Local Presence Audit V0: `80fb98397df556bff033be0b15a8892e55189384`.":
        "- PR #155 integró `LOCALP-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3354 terminó SUCCESS completo.\n- PR #157 integró `SOCAUD-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3356 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Social Media Audit V0: `bbc825c0743654270306e544d74dd498c907c787`.",
        "- Engine Registry actual: `0.18.0`.": "- Engine Registry actual: `0.19.0`.",
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `WAUD-001`, `KW-001`, `LOCALP-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 16 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.":
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `WAUD-001`, `KW-001`, `LOCALP-001`, `SOCAUD-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 15 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual."
    }
    for old, new in replacements.items():
        if old not in s:
            raise SystemExit(f'missing STATUS fragment: {old[:140]}')
        s = s.replace(old, new)

    marker = '## HECHO / VERDE · CEREBRO CONSOLE CHAIN V0 PREPROD'
    section = """## HECHO / VERDE · SOCIAL MEDIA AUDIT V0 PREPROD
- `SOCAUD-001` V0.2: `CONFIRMED_OPERATIONAL` en PREPROD como auditoría social determinista pública/read-only.
- Consume `AUD-001`, `BMD-001`, `SCAN-001` y evidencia social pública fechada; no usa login, credenciales ni APIs privadas.
- Audita perfiles observados, formatos, cobertura y cadencia sólo cuando existen timestamps suficientes.
- Followers, audiencia, alcance, engagement y demografía nunca se estiman; sólo se aceptan como evidencia pública explícita y fechada.
- No publica, no envía mensajes y no realiza escritura remota.
- Rechaza cruce de `company_id`, material sensible y ejecución PROD; coste adicional 0 € y sin IA obligatoria.
- FACT-001 preservó scaffold 0.1.0 y promovió `SOCAUD-001` a 0.2.0; Registry global `0.19.0`; dependency map `0.9.0`.
- PR #157: Factory V0 #379 SUCCESS + App Compatibility #97 SUCCESS. Post-merge PREPROD #3356 / run `34250578133`: SUCCESS completo.
- Autonomía: `PREPROD_DETERMINISTIC_PUBLIC_READ_ONLY_SOCIAL_AUDIT`; PROD: `DENY`.
- Evidencia: `governance/socaud-001-v0-closeout-2026-09-08.json`.

"""
    if '## HECHO / VERDE · SOCIAL MEDIA AUDIT V0 PREPROD' not in s:
        if marker not in s:
            raise SystemExit('console marker missing')
        s = s.replace(marker, section + marker)
    p.write_text(s, encoding='utf-8')

    evidence = {
        'date': '2026-09-08',
        'engine_id': 'SOCAUD-001',
        'version': '0.2.0',
        'status': 'CONFIRMED_OPERATIONAL_PREPROD_PUBLIC_READ_ONLY',
        'pr': 157,
        'pr_head_sha': 'd16e8ce1130b183567486b370296846b8f2a6b11',
        'merge_sha': 'bbc825c0743654270306e544d74dd498c907c787',
        'required_checks': {
            'FACT-001 Factory V0': {'run_id': 34248596542, 'run_number': 379, 'conclusion': 'SUCCESS'},
            'FACT-001 App Compatibility': {'run_id': 34248596446, 'run_number': 97, 'conclusion': 'SUCCESS'}
        },
        'post_merge_preprod': {'run_id': 34250578133, 'run_number': 3356, 'conclusion': 'SUCCESS'},
        'registry_version': '0.19.0',
        'dependency_map_version': '0.9.0',
        'wave1_implemented': 14,
        'wave1_defined_not_built': 15,
        'remote_write': False,
        'private_social_api': False,
        'fabricated_audience_metrics': False,
        'additional_cost_eur': 0,
        'prod_autonomy': 'DENY',
        'prod_mutation': False
    }
    q = pathlib.Path('cerebro/factory/governance/socaud-001-v0-closeout-2026-09-08.json')
    q.write_text(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
