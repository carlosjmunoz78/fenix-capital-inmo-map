# UMS001 Poly Haven CC0 LAB automatic asset fetch V0

- company_id=fenix | engine_id=UMS-001 | environment=LAB | version=0.1.
- Approved provider: Poly Haven, assets CC0. Public API allowed free for business. API requires a unique User-Agent and visible attribution "Powered by Poly Haven". https://polyhaven.com/our-api
- No model training or autonomous publication is authorized in this LAB flow. No new subscription or billable endpoint.
- Script polyhaven_auto_lab_v0.py: 2 downloads/run, 15 MiB/file, 20 MiB total, HTTPS URL allowlist, declared length and MD5 verification, SHA256 manifest, local state-based de-duplication and no overwrite.
- A GitHub push to the isolated LAB branch runs offline tests. A commit to the workflow or the Python files marked [polyhaven-run] additionally activates a bounded live attempt.
- The workflow does not have write access to GitHub and does not use secrets. It stores 3-day GitHub Actions artifacts and a best-effort dedupe cache. It does not touch main, production, CRM, Supabase, DNS, media production, or other engines.
- No daily recurrence yet: GitHub Actions schedule only executes workflows from the default branch; do not modify main just to activate it. A future isolated scheduler can trigger LAB only after budget and QA checks.
- There is no direct automatic upload to Google Drive yet. GH artifacts are not the same as Drive files; this is an outstanding integration gate.
- Standard command: python cerebro/media-studio/v2/asset-scout/polyhaven_auto_lab_v0.py --live --asset-type textures --query "architecture urban courtyard brick floor"
- Offline tests: cd cerebro/media-studio/v2/asset-scout && python -m unittest test_polyhaven_auto_lab_v0.py -v
- State: DEVELOPMENT / TESTED_OFFLINE / REAL_RUN_PENDING. Cost authorized=0EUR.
- This is a selective asset downloader, not unlimited catalogue harvesting. Stop if Github Free quota is exhausted.
