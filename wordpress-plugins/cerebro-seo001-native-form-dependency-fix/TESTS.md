# Acceptance tests

1. Wrapper activates only on `staging.fenixcapital.es`.
2. It changes no dependency on Elementor-built posts/pages.
3. On non-Elementor pages, it removes only `elementor-frontend` from the native-form handle dependencies.
4. Native-form behavior remains functional.
5. The previous `elementorFrontendConfig is not defined` console failure is absent.
6. Core Guard and CEREBRO Universal smoke checks remain green.
