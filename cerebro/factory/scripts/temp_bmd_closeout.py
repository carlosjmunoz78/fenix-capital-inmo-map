from __future__ import annotations
import json
import pathlib


def main() -> None:
    p = pathlib.Path('cerebro/factory/STATUS.md')
    s = p.read_text(encoding='utf-8')
    replacements = {
        "- PR #147 integró `SCAN-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3346 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Digital Footprint Scanner V0: `6928e0e72434f5e354b420e7327b62fcc245691f`.":
        "- PR #147 integró `SCAN-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3346 terminó SUCCESS completo.\n- PR #149 integró `BMD-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3348 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Business Model Discovery V0: `a00e72e87ca2063673919b6d88cf74fefbf4c93c`.",
        "- Engine Registry actual: `0.14.0`.": "- Engine Registry actual: `0.15.0`.",
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 20 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.":
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `BMD-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 19 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.",
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 9 motores tienen V0.2 operativa PREPROD y 20 permanecen `DEFINED_NOT_BUILT`.":
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 10 motores tienen V0.2 operativa PREPROD y 19 permanecen `DEFINED_NOT_BUILT`.",
        "- **SCAN-001:** `CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY` V0.2; señales públicas HTTP, evidencia fechada SHA-256, sin escritura remota y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**":
        "- **SCAN-001:** `CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY` V0.2; señales públicas HTTP, evidencia fechada SHA-256, sin escritura remota y PROD DENY.\n- **BMD-001:** `CONFIRMED_OPERATIONAL_PREPROD` V0.2; ensamblaje determinista de modelo de negocio con `LOW_CONFIDENCE` ante evidencia insuficiente y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**",
        "- **Engine Registry:** `0.14.0`, 46 IDs, sin duplicados conocidos.": "- **Engine Registry:** `0.15.0`, 46 IDs, sin duplicados conocidos.",
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3346 SUCCESS sobre `6928e0e72434f5e354b420e7327b62fcc245691f`.":
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3348 SUCCESS sobre `a00e72e87ca2063673919b6d88cf74fefbf4c93c`.",
        "- **Siguiente acción estructural planificada:** implementar `BMD-001` en PREPROD por dependencia real (`COMP-REG-001 + SCAN-001`) antes de `WAUD-001/KW-001`; documentar sin romper la discrepancia entre secuencia textual de onboarding y grafo Factory.":
        "- **Siguiente acción estructural planificada:** implementar `WAUD-001` en PREPROD sobre `BMD-001 + SCAN-001 + WEB-001`; después `KW-001`, siguiendo el grafo Factory hasta reconciliar la secuencia textual de onboarding."
    }
    for old, new in replacements.items():
        if old not in s:
            raise SystemExit(f'missing STATUS fragment: {old[:100]}')
        s = s.replace(old, new)
    marker = '## HECHO / VERDE · CEREBRO CONSOLE CHAIN V0 PREPROD'
    section = """## HECHO / VERDE · BUSINESS MODEL DISCOVERY V0 PREPROD
- `BMD-001` V0.2: `CONFIRMED_OPERATIONAL` en PREPROD como ensamblador determinista de modelo de negocio basado en evidencia.
- Consume identidad/geografía de `COMP-REG-001`, huella pública de `SCAN-001` y hechos explícitamente declarados.
- No inventa servicios, productos, clientes, canales, propuesta de valor, objetivos o restricciones; ante huecos críticos devuelve `LOW_CONFIDENCE` con campos faltantes.
- Rechaza cruce de `company_id`, material sensible y cualquier ejecución PROD; coste adicional 0 € y sin IA obligatoria.
- FACT-001 preservó scaffold 0.1.0 y promovió `BMD-001` a 0.2.0; Registry global `0.15.0`; dependency map `0.5.0`.
- PR #149: Factory V0 #337 SUCCESS + App Compatibility #89 SUCCESS. Post-merge PREPROD #3348 / run `34228839031`: SUCCESS completo.
- La discrepancia textual `SCAN → KW → WAUD ... BMD` frente al grafo Factory se mantiene documentada; ejecución sigue `SCAN → BMD → WAUD → KW` hasta reconciliación explícita.
- Autonomía: `PREPROD_DETERMINISTIC_DISCOVERY_ONLY`; PROD: `DENY`.
- Evidencia: `governance/bmd-001-v0-closeout-2026-09-08.json`.

"""
    if '## HECHO / VERDE · BUSINESS MODEL DISCOVERY V0 PREPROD' not in s:
        if marker not in s:
            raise SystemExit('console marker missing')
        s = s.replace(marker, section + marker)
    p.write_text(s, encoding='utf-8')

    evidence = {
        'date': '2026-09-08',
        'engine_id': 'BMD-001',
        'version': '0.2.0',
        'status': 'CONFIRMED_OPERATIONAL_PREPROD',
        'pr': 149,
        'pr_head_sha': '3491fc19def8824347d37192dbb122522b01a627',
        'merge_sha': 'a00e72e87ca2063673919b6d88cf74fefbf4c93c',
        'required_checks': {
            'FACT-001 Factory V0': {'run_id': 34228438197, 'run_number': 337, 'conclusion': 'SUCCESS'},
            'FACT-001 App Compatibility': {'run_id': 34228438072, 'run_number': 89, 'conclusion': 'SUCCESS'}
        },
        'post_merge_preprod': {'run_id': 34228839031, 'run_number': 3348, 'conclusion': 'SUCCESS'},
        'registry_version': '0.15.0',
        'dependency_map_version': '0.5.0',
        'wave1_implemented': 10,
        'wave1_defined_not_built': 19,
        'claim_invention_allowed': False,
        'low_confidence_policy': 'LOW_CONFIDENCE',
        'additional_cost_eur': 0,
        'prod_autonomy': 'DENY',
        'prod_mutation': False,
        'next_engine_by_dependency': 'WAUD-001',
        'sequence_discrepancy': 'COMP-ONB textual sequence places KW/WAUD before BMD; Factory dependencies require BMD before WAUD/KW. Execution follows Factory dependency graph until explicit reconciliation.'
    }
    q = pathlib.Path('cerebro/factory/governance/bmd-001-v0-closeout-2026-09-08.json')
    q.write_text(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
