# L7 Foundation Wave 1 Changelog

- Audited 15 L7 engines before implementation: 1 PHYSICAL_EXISTING, 3 PHYSICAL_PARTIAL, 11 DOCUMENTED_ONLY, 0 SCAFFOLD_ONLY.
- Preserved `EXP-001` without modification.
- Added WRAP_PRESERVE metadata for `INN-001`, `LAB-MKT`, and `EXPAND-001` using observed runtime paths.
- Added one shared deterministic L7 foundation runtime for the 14 nonphysical engines.
- Added explicit Trading isolation guard for `LAB-TRD`; no Trading resources or credentials are used.
- Added multi-company deny-by-default context, canonical HUMAN_REQUIRED boundaries, zero-cost/no-PROD/no-external-action manifests, and focused tests.
