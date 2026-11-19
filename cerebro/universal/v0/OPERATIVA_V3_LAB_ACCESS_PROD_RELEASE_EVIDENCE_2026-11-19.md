# CEREBRO OS · OPERATIVA V3 · LAB CONTROL ACCESS · Physical PROD release

Date: 2026-11-19 · Environment: FENIX PROD · Change class: non-invasive navigation only.
Status: **HECHO (navigation)** · **PARCIAL (engine execution)**.

## Source / dependency inventory
- Source repo: `carlosjmunoz78/fenix-capital-inmo-map`.
- Previous physical production SHA: `914144a5d83d5ec79d1b8c77367a60f7c15d756f`, deployment `dpl_EXDsPFMDd5J7mD1WqpVasUsV6mvf`.
- New physical production SHA: `a078d07e1c6bd1b058043bccd69923fcd256c073`, deployment `dpl_3jZ9UZwEoXEE4wDd2vHpEqErHNGQ`.
- Project `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`, team `team_qnh6u1Ofy2WPp0MGEKlyMA50`.
- Physical alias checked: `app.fenixcapital.es` -> `dpl_3jZ9UZwEoXEE4wDd2vHpEqErHNGQ`.
- Same SHA from PROD `https://app.fenixcapital.es/PROD_SOURCE_SHA.txt`.
- 1 commit ahead, 0 behind previous source, exactly 4 changed files: Cockpit TSX, CSS, unit tests, candidate runbook. No API, databases, auth, UI modules or existing operations replaced.
- External dependency: `https://fenix-capital-preprod-operativa.vercel.app/cerebro?section=operativa&op3_panel=motores`, Vercel alias `dpl_4Xwtrgm4rrxtZz4WyjVA3qMND915`, project `prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc`. Controls are LAB-restricted and owner authenticated, never PROD executed.

## Physical checks
- 7/7 focused static source checks in connected GitHub source PASS (including Fénix scope, noreferrer/noopener and no new executor imported).
- Vercel preview `dpl_4sg9EfGjZ8QyD3d725DBH3d1BHMw` READY, exact SHA and source stamp emission.
- LAB alias recovery drill performed: preview alias -> previous READY production deploy -> candidate preview, both assignments confirmed. Production rollback was not executed.
- Production deployment READY; TypeScript/Vite build succeeded and `SOURCE_STAMP_EMITTED_SHA_VALID` in build log.
- Physical Opera PROD UI `?section=operativa&op3_panel=motores`: 'Mandos reales de LAB', 'Abrir mandos LAB', 2506 profiles, 179 registered motors, V3 PROD. `?section=operativa&op3_panel=trabajos`: 'Trabajos y ejecuciones' and LAB shortcut. Both deep links verified.
- Physical PROD source stamp: `a078d07e1c6bd1b058043bccd69923fcd256c073`.
- GitHub `CEREBRO PROD Source Audit V1` rerun `44481227840` / job `135756935338` SUCCESS: source verification, artifact upload and summary SUCCESS. Artifact ID `14558930949`, digest `sha256:bcd919786f8a2b72a65406f7033b00cf3e6178674124966fddbcbe26f8f4b61f`.
- Vercel runtime errors query 20m: no errors returned. This does not constitute global E2E coverage.
- PR #81 remains DRAFT and unmerged; execution components LAB-only.

## Rollback / rebuild
- Existing ready rollback target `dpl_EXDsPFMDd5J7mD1WqpVasUsV6mvf` physically confirmed READY.
- If regression appears, confirm current exact alias and reassign `app.fenixcapital.es` to previous deployment by ID; verify `/cerebro`, `/PROD_SOURCE_SHA.txt` and source audit.
- Rebuild candidate from exact Git SHA, not default `main`; note initial physical source audit fix is a separate ancestor.
- This documentation commit is **not deployed**. Physical PROD SHA remains `a078d07e...`, even if this branch acquires future commits.

## Certification boundary
- PROD access/navigation: verified.
- QA-001/CERT-001/CONSOLE-001 operations: existing LAB, user chooses separate private link. Owner auth and LAB-specific contract remain enforced.
- PROD motor execution, FACT/UMS, global tribunal, autonomous agents: **HOLD**. No hidden promotions.
- App/CRM databases, WordPress, Cloudflare, Trading, production auth, public DNS: unchanged.
- Additional subscriptions: 0 €. Marginal provider usage not measured.
