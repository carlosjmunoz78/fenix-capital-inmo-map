# SEO-001 · Fénix Capital STAGING · Home final polish

Date: 2026-10-19
Environment: PREPROD / STAGING
Company: fenix
Page: Home, post ID 52487
PROD touched: NO

## HECHO

- Removed decorative numeric labels 01–04 from the four moment/solution cards.
- Removed decorative numeric labels 01–03 from the person/profile cards.
- Kept only meaningful sequential numbers in the process block (01 Situation, 02 Review, 03 Strategy, 04 Follow-up).
- Kept substantive numeric claims/questions such as 100% and 24–48 h; they are content, not decoration.
- Reworked the Andalucía block around the headline `Tu hipoteca, a unos clics de ti.`.
- Replaced `8 provincias` badge with `Cobertura en Andalucía` to reduce unnecessary numeric noise.
- Removed province decorative numbers 01–08 and later removed the orphan arrows left by that layout.
- Improved Andalucía copy to `Elige tu provincia y empieza con un asesoramiento hipotecario adaptado a tu zona.`
- Kept eight province links: Almería, Cádiz, Córdoba, Granada, Huelva, Jaén, Málaga, Sevilla.
- Mobile province grid uses two columns with reduced card spacing; no horizontal overflow.
- Removed leftover mobile spacing that belonged to deleted numeric labels.
- Verified all visible editorial images have alt text and load after lazy-scroll.

## BACKUP / ROLLBACK

Core Guard post snapshots created during this polish: 1039, 1040, 1041, 1042.
Latest pre-arrow-cleanup snapshot: 1042.
Rollback is available through the existing Core Guard post snapshot restore path.

CEREBRO Pro-Free Compatibility V0 v0.1.4-preprod backup was refreshed on 2026-10-19 with SHA256:
`f8207346163f79db572bc54bccf06dad6a42efc112cba9e4f9a487972d0a6ceb`.

## QA

Final focused home review workflow:
`CEREBRO Fenix STAGING Home Final Review`
Run: 39216846044
Latest job: 117945337748
Conclusion: SUCCESS

Validated widths: 390, 768, 1440 px.
- HTTP 200 at all widths.
- JavaScript page errors: 0.
- Horizontal overflow: 0.
- Single expected H1.
- All three editorial images loaded with natural dimensions and non-empty alt text.
- Remaining number-like labels detected in the home body are only the intentional process sequence 01–04.

## PARCIAL / BLOCKER BEFORE CLAIMING 100% READY FOR PROD

Desktop fallback header still renders an `Inicio` menu item. The source is the active `CEREBRO Pro-Free Compatibility V0` v0.1.4-preprod fallback header, not the native WordPress/Astra menu. The current safe WordPress connector does not expose plugin-source edit capability, so this item has not been hidden with CSS/JS or changed blindly.

Do not mark the presentation layer as 100% final until `Inicio` is removed through the source/plugin path and the header is re-tested.

## PROD CUTOVER NOTES

STAGING intentionally remains `noindex,nofollow`. Canonical/self-canonical and indexability must be verified/switched as part of the controlled PROD promotion, not by changing STAGING protection now.
