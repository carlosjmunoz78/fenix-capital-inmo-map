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

Latest source-context diagnostic:
- Commit: `46b71946afb839a34f5a47851a5fd0ea886afe47`
- Run: `39218795218`
- Job: `117948931270`
- Conclusion: SUCCESS
- Artifact: `12171006716`
- Artifact SHA256: `e2668dd2001776ddce8ef388a0aac06ffaadbf3545b4733419c2464c6062362f`

Validated widths: 390, 768, 1440 px.
- HTTP 200 at all widths.
- JavaScript page errors: 0.
- Horizontal overflow: 0.
- Single expected H1.
- All three editorial images loaded with natural dimensions and non-empty alt text.
- Remaining number-like labels detected in the home body are only the intentional process sequence 01–04.

## PARCIAL / BLOCKER BEFORE CLAIMING 100% READY FOR PROD

Desktop fallback header still renders one redundant `Inicio` item.

Live DOM source was pinned by CI, not inferred:
- Header class: `cerebro-pf-header`
- Nav id: `cerebro-pf-nav`
- Nav class: `cerebro-pf-nav`
- First item: `<a href="https://staging.fenixcapital.es/">Inicio</a>`
- Remaining navigation: Hipotecas dropdown, Servicios dropdown, Quiénes somos, Blog, Contacto and `Calculadora Hipotecaria` CTA.

The generator is the active `CEREBRO Pro-Free Compatibility V0` v0.1.4-preprod fallback header (`cerebro_profree_header()`), not the native WordPress/Astra menu.

Safe-source rule: remove only the first hardcoded `Inicio` anchor from the plugin source; preserve logo, dropdowns, all remaining links, CTA, responsive behavior and Pro-Free fallback contract.

Current authenticated WordPress connector can back up/restore the plugin and manage activation, but does not expose plugin-source edit/write. The authenticated browser role explicitly returns `Lo siento, no tienes permisos para acceder a esta página.` for `wp-admin/plugin-editor.php`. Cowboy/WPVibe file routes are unavailable and must not be used as a workaround. Therefore no CSS/JS concealment, Astra/theme hack or blind plugin reconstruction has been applied.

Do not mark the presentation layer as 100% final until the source-level single-link deletion is physically applied and re-tested.

## PROD CUTOVER NOTES

STAGING intentionally remains `noindex,nofollow`. Canonical/self-canonical and indexability must be verified/switched as part of the controlled PROD promotion, not by changing STAGING protection now.

PROD remains untouched and promotion remains closed while the presentation blocker above is open.
