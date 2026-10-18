# FÉNIX CAPITAL · STAGING V4 · ARTIFACT POINTER · 2026-10-18

- Company: `fenix-capital`
- Environment: `STAGING`
- PROD touched: `false`
- Workflow: `CEREBRO Fenix STAGING Whole-Site Baseline`
- Workflow run: `39083584923`
- Successful scan/package job: `117554274470`
- Immutable GitHub Actions artifact ID: `12120333543`
- Artifact name: `CEREBRO_FENIX_STAGING_BASELINE_2026-10-18`
- Uploaded artifact container SHA256: `6d05d025c66f0a26b15e28bb6e6f7f1725ed1f430ec195436e3fb25b910fdc61`
- Inner exact baseline ZIP SHA256: `59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04`
- Generated at: `2026-10-18T01:27:55+00:00`

## Validated counts

- WordPress pages: **167**
- Posts: **32**
- Categories: **5**
- Content URLs snapshotted: **204**
- Media objects: **690**
- Images: **680**
- Internal link edges: **42073**
- External link edges: **263**
- Dependency edges: **51129**
- Unique internal HTTP targets checked: **212**
- Broken internal targets: **0**
- Redirected internal targets: **2**
- Export errors: **0**
- Image binary retrieval failures: **0**

## Residual redirects

The two remaining redirected internal targets are author archives and both resolve to the STAGING homepage:

1. `https://staging.fenixcapital.es/author/fenixcapital/`
2. `https://staging.fenixcapital.es/author/mrbogart/`

The former legacy content link `/familias/` is no longer present among redirected internal targets after the source correction.

## Persistence note

The scan, contract validation, packaging and immutable artifact upload all completed successfully. The job's final optional push-back step failed only because the audit branch had advanced concurrently and Git rejected a non-fast-forward push. The artifact above is therefore the canonical exact V4 snapshot. The older branch snapshot remains preserved rather than being overwritten destructively.
