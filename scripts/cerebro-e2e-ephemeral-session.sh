#!/usr/bin/env bash
# CI-only browser-equivalent auth: obtain a fresh, short-lived Supabase access JWT.
# Purpose-provisioned TEST USER only; do not change existing user roles.
set -euo pipefail
umask 077
: "${PROD_URL:?Missing PROD_URL}"
: "${PROD_PUBLISHABLE_KEY:?Missing PROD_PUBLISHABLE_KEY}"
if [[ -z "${CEREBRO_E2E_TEST_EMAIL:-}" || -z "${CEREBRO_E2E_TEST_PASSWORD:-}" ]]; then
  echo 'E2E_AUTH=BLOCKED_DEDICATED_TEST_IDENTITY_NOT_CONFIGURED' >&2
  exit 42
fi
command -v jq >/dev/null || { echo 'E2E_AUTH=BLOCKED_JQ_MISSING' >&2; exit 42; }
case "$PROD_URL" in https://cluhljgonannaafpmblx.supabase.co) ;; *)
  echo 'E2E_AUTH=BLOCKED_UNEXPECTED_AUTH_ISSUER' >&2; exit 42;; esac
case "$PROD_PUBLISHABLE_KEY" in sb_publishable_*) ;; *)
  echo 'E2E_AUTH=BLOCKED_PUBLISHABLE_KEY_INVALID' >&2; exit 42;; esac
response="$(mktemp)"
payload="$(mktemp)"
trap 'rm -f "$response" "$payload"' EXIT
jq -nc --arg email "$CEREBRO_E2E_TEST_EMAIL" --arg password "$CEREBRO_E2E_TEST_PASSWORD" \
  '{email:$email,password:$password}' > "$payload"
status="$(curl --silent --show-error --output "$response" --write-out '%{http_code}' \
  --max-time 25 -X POST -H "apikey: ${PROD_PUBLISHABLE_KEY}" \
  -H 'content-type: application/json' --data-binary "@${payload}" \
  "${PROD_URL}/auth/v1/token?grant_type=password" || true)"
if [[ "$status" != 200 ]]; then
  echo "E2E_AUTH=BLOCKED_EXCHANGE_HTTP_${status:-NETWORK_ERROR}" >&2
  exit 42
fi
jwt="$(jq -er '.access_token|select(type=="string" and length>80)' "$response" 2>/dev/null)" || {
  echo 'E2E_AUTH=BLOCKED_NO_ACCESS_JWT' >&2; exit 42;
}
ttl="$(jq -er '.expires_in|select(type=="number" and .>=120 and .<=86400)' "$response" 2>/dev/null)" || {
  echo 'E2E_AUTH=BLOCKED_INVALID_TTL' >&2; exit 42;
}
claims="$(JWT_VALUE="$jwt" node -e '
const b=process.env.JWT_VALUE?.split(".")[1];if(!b)process.exit(3);
try{
 const c=JSON.parse(Buffer.from(b,"base64url").toString("utf8"));
 const now=Math.floor(Date.now()/1000);
 if(c.aud!=="authenticated"||c.role!=="authenticated"||!(c.exp>now+90)||
    !String(c.iss||"").startsWith("https://cluhljgonannaafpmblx.supabase.co/auth/v1"))process.exit(3);
 process.stdout.write("VALID");
}catch{process.exit(3);}
' 2>/dev/null)" || { echo 'E2E_AUTH=BLOCKED_INVALID_CLAIMS' >&2;exit 42; }
[[ "$claims" == VALID ]] || exit 42
echo "::add-mask::${jwt}"
{
 printf 'CEREBRO_E2E_USER_JWT=%s\n' "$jwt"
 printf 'JARVIS_E2E_JWT=%s\n' "$jwt"
 printf 'CEREBRO_E2E_AUTH_MODE=EPHEMERAL_PASSWORD_GRANT\n'
} >> "${GITHUB_ENV:?GitHub environment file required}"
echo 'E2E_AUTH=FRESH_JWT_GRANTED'
