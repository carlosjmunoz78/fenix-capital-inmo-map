from __future__ import annotations
import json
import pathlib


def main() -> None:
    p = pathlib.Path('cerebro/factory/STATUS.md')
    s = p.read_text(encoding='utf-8')
    replacements = {
        "- PR #145 integró `COMP-ONB-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3344 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Company Onboarding V0: `6cec93ae84dc9a557c0cea044bdc2b2bc273f9da`.":
        "- PR #145 integró `COMP-ONB-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3344 terminó SUCCESS completo.\n- PR #147 integró `SCAN-001` V0.2 tras Factory + App Compatibility verdes; `PRE-PROD App Build` #3346 terminó SUCCESS completo.\n- HEAD PREPROD confirmado tras Digital Footprint Scanner V0: `6928e0e72434f5e354b420e7327b62fcc245691f`.",
        "- Engine Registry actual: `0.13.0`.": "- Engine Registry actual: `0.14.0`.",
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 21 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.":
        "- De los 29 motores Wave 1, `COMP-REG-001`, `TENANT-001`, `COMP-ONB-001`, `SCAN-001`, `CTX-001`, `CHAT-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` ya tienen implementación V0.2 validada en PREPROD.\n- Los restantes 20 motores Wave 1 conservan su scaffold `0.1.0` como `DEFINED_NOT_BUILT` hasta implementación/promoción individual.",
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 8 motores tienen V0.2 operativa PREPROD y 21 permanecen `DEFINED_NOT_BUILT`.":
        "- Wave 1: **MATERIALIZADA Y VALIDADA EN PREPROD**; 9 motores tienen V0.2 operativa PREPROD y 20 permanecen `DEFINED_NOT_BUILT`.",
        "- **COMP-ONB-001:** `CONFIRMED_OPERATIONAL_PREPROD` V0.2; orquestación determinista, sin autoejecución downstream y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**":
        "- **COMP-ONB-001:** `CONFIRMED_OPERATIONAL_PREPROD` V0.2; orquestación determinista, sin autoejecución downstream y PROD DENY.\n- **SCAN-001:** `CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY` V0.2; señales públicas HTTP, evidencia fechada SHA-256, sin escritura remota y PROD DENY.\n- **CTX/CHAT/CMD/ACTGW/CONSOLE V0:**",
        "- **Engine Registry:** `0.13.0`, 46 IDs, sin duplicados conocidos.": "- **Engine Registry:** `0.14.0`, 46 IDs, sin duplicados conocidos.",
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3344 SUCCESS sobre `6cec93ae84dc9a557c0cea044bdc2b2bc273f9da`.":
        "- **App compatibility:** `CONFIRMED_OPERATIONAL_PREPROD`; post-merge #3346 SUCCESS sobre `6928e0e72434f5e354b420e7327b62fcc245691f`.",
        "- **Siguiente acción estructural planificada:** implementar `SCAN-001` en PREPROD como scanner de huella digital read-only, determinista/injectable, sin pago, sin crear infraestructura ni tocar PROD.":
        "- **Siguiente acción estructural planificada:** implementar `BMD-001` en PREPROD por dependencia real (`COMP-REG-001 + SCAN-001`) antes de `WAUD-001/KW-001`; documentar sin romper la discrepancia entre secuencia textual de onboarding y grafo Factory."
    }
    for old, new in replacements.items():
        if old not in s:
            raise SystemExit(f'missing STATUS fragment: {old[:100]}')
        s = s.replace(old, new)
    marker = '## HECHO / VERDE · CEREBRO CONSOLE CHAIN V0 PREPROD'
    section = """## HECHO / VERDE · DIGITAL FOOTPRINT SCANNER V0 PREPROD
- `SCAN-001` V0.2: `CONFIRMED_OPERATIONAL` en PREPROD como scanner determinista/read-only de huella digital pública.
- Conserva `WEB-001` como frontera web canónica y no duplica crawler/servidor; inventario de repo no encontró capacidad equivalente existente.
- Inspecciona root HTML, `robots.txt`, `sitemap.xml`, señales tecnológicas heurísticas y perfiles sociales públicos enlazados mediante fetcher inyectado.
- CI no depende de Internet; tests usan fetcher local falso. No login, credenciales, polling, brute force, enumeración agresiva ni escritura remota.
- Cada salida conserva `company_id`, dominio, `evidence_at`, `evidence_sha256`, `read_only=true` y coste externo 0 €.
- FACT-001 preservó scaffold 0.1.0 y promovió Registry a `SCAN-001` 0.2.0; Registry global `0.14.0`; dependency map `0.4.0`.
- PR #147: Factory V0 #330 SUCCESS + App Compatibility #87 SUCCESS. Post-merge PREPROD #3346 / run `34225431530`: SUCCESS completo.
- Autonomía: `PREPROD_READ_ONLY_SCANNER`; PROD: `DENY`.
- Evidencia: `governance/scan-001-v0-closeout-2026-09-08.json`.

"""
    if '## HECHO / VERDE · DIGITAL FOOTPRINT SCANNER V0 PREPROD' not in s:
        if marker not in s:
            raise SystemExit('console marker missing')
        s = s.replace(marker, section + marker)
    p.write_text(s, encoding='utf-8')

    evidence = {
        'date': '2026-09-08',
        'engine_id': 'SCAN-001',
        'version': '0.2.0',
        'status': 'CONFIRMED_OPERATIONAL_PREPROD_READ_ONLY',
        'pr': 147,
        'pr_head_sha': '824d00b4de1caec8d430f74854ece5aa7ff05af0',
        'merge_sha': '6928e0e72434f5e354b420e7327b62fcc245691f',
        'required_checks': {
            'FACT-001 Factory V0': {'run_id': 34225069226, 'run_number': 330, 'conclusion': 'SUCCESS'},
            'FACT-001 App Compatibility': {'run_id': 34225069563, 'run_number': 87, 'conclusion': 'SUCCESS'}
        },
        'post_merge_preprod': {'run_id': 34225431530, 'run_number': 3346, 'conclusion': 'SUCCESS'},
        'registry_version': '0.14.0',
        'dependency_map_version': '0.4.0',
        'wave1_implemented': 9,
        'wave1_defined_not_built': 20,
        'read_only': True,
        'internet_required_for_ci': False,
        'additional_cost_eur': 0,
        'prod_autonomy': 'DENY',
        'prod_mutation': False,
        'next_engine_by_dependency': 'BMD-001',
        'sequence_discrepancy': 'COMP-ONB textual sequence places KW/WAUD before BMD, while Factory dependencies require BMD before WAUD/KW; preserve both and follow dependency graph until reconciled.'
    }
    q = pathlib.Path('cerebro/factory/governance/scan-001-v0-closeout-2026-09-08.json')
    q.write_text(json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
