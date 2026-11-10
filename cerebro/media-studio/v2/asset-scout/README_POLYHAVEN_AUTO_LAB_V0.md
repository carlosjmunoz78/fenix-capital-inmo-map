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


## Verificación física — 10 noviembre 2026
- GitHub Actions run 1 https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42797679685 : SUCCESS, tests QA.
- GitHub Actions run 2 https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42797939269 : SUCCESS, 7 tests and 2 genuine Poly Haven files, 652338 bytes, hashes MD5 validated, no errors. These were two displacement maps, not full videos.
- GitHub Actions run 3 https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42798486824 : SUCCESS after file preference improved, 8 tests and 2 additional genuine files, 1482394 bytes, hashes validated, no errors. Includes one diffuse/color map and one AO EXR.
- Two immutable ZIP bundles including original files, source receipts, SHA256 and states uploaded and verified in private Google Drive folder https://drive.google.com/drive/folders/1__pmqry_ICA0dgQELWZ4uKcgp5tG-xYl .
- Drive bundle A: https://drive.google.com/file/d/1dtLaSJ1BTBZQqlf93RJYqlWzkOBk-6cF/view
- Drive bundle B: https://drive.google.com/file/d/1ywMpCBD4SbPBKVlMcR4NU1dzrD6UDznp/view
- These are CC0 production source candidates, not finished VFX clips. Human/rights QA remains required before PROD publication. No user API key, purchases, new subscriptions, CRM, App, Supabase or main changes.
- Operational limitation: Continuous scheduled download and hands-free Drive import are NOT yet evidenced. Trigger exists as isolated GitHub Actions push with [polyhaven-run] marker and artifacts in GitHub, and Drive transfer was performed from the connected ChatGPT session via connectors.
