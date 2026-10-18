# Contract delta

Input condition: frontend request on exact host `staging.fenixcapital.es`.

Protected handle: `cerebro-universal-landing-native-form`.

Behavior:
- If page is Elementor-edited: no change.
- If handle is unregistered: no change.
- If dependency list does not contain `elementor-frontend`: no change.
- Otherwise: remove only `elementor-frontend` from that handle's dependencies.

No content, DB, CRM, lead schema, theme, or PROD mutation.
