# FÉNIX CAPITAL · STAGING V5 · P0 CHANGELOG

**Entorno:** STAGING  
**PROD:** no tocado  
**OLD inmutable:** V4 · `59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04`

## Recovery evidence
- GitHub Actions artifact `12120333543` descargado y verificado.
- Artifact container SHA256: `6d05d025c66f0a26b15e28bb6e6f7f1725ed1f430ec195436e3fb25b910fdc61`.
- Inner V4 ZIP SHA256: `59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04`.
- Astra 4.14.1 backup SHA256: `16bbd23d711c8b29d62f8eff458691a20e6b9eedd704fe3ea1609299df12c1f6`.
- Post snapshot `52228` → `1027`.
- Post snapshot `49128` → `1028`.

## V5-C001 · public test artifact
**OLD:** `/cerebro-core-guard-final-test-20260903/` returned the technical validation page and exposed two H1-equivalent headings.  
**NEW:** page moved to WordPress trash, which is reversible; direct visitor navigation now returns “Página no encontrada”.  
**Rollback:** restore page from trash; snapshot `1027`.

## V5-C002 · empty meta on Montilla B2B landing
**OLD:** meta description empty on `/financiacion-compradores-inmobiliarias-montilla/`.  
**NEW:** factual 144-character meta description derived from existing page content.  
**Verification:** SEO field readback confirms the value.  
**Rollback:** snapshot `1028`.

## Still open in P0
- Category `/category/hipotecas/` meta is empty while the taxonomy description is populated: root owner still to identify.
- 24 LOCAL_B2C near-duplicate pages require source-backed local differentiation or hold/consolidation.
- Real Lighthouse/CWV + responsive visual QA.
- Forms→CRM E2E.
- Consent/tracking E2E.
