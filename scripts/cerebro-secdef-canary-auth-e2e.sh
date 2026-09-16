#!/usr/bin/env bash
set -euo pipefail

: "${PROD_URL:?PROD_URL is required}"
: "${PROD_PUBLISHABLE_KEY:?PROD_PUBLISHABLE_KEY is required}"
: "${CEREBRO_E2E_USER_JWT:?CEREBRO_E2E_USER_JWT is required}"

CANARY_URL="${CANARY_URL:-${PROD_URL}/functions/v1/fenix-app-gateway-v2-canary}"
REST_URL="${REST_URL:-${PROD_URL}/rest/v1/rpc}"

headers=(
  -H "apikey: ${PROD_PUBLISHABLE_KEY}"
  -H "Authorization: Bearer ${CEREBRO_E2E_USER_JWT}"
  -H "Content-Type: application/json"
)

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

canon() { jq -S -c . "$1"; }

call_old() {
  local fn="$1" body="$2" out="$3"
  curl --fail --silent --show-error --max-time 30 \
    "${headers[@]}" \
    -X POST "${REST_URL}/${fn}" \
    --data "$body" >"$out"
}

call_new_get() {
  local path="$1" out="$2"
  curl --fail --silent --show-error --max-time 30 \
    "${headers[@]}" \
    "${CANARY_URL}${path}" >"$out"
}

compare_pair() {
  local label="$1" old_fn="$2" new_path="$3"
  local old="$tmp/${label}.old.json" new="$tmp/${label}.new.json"
  call_old "$old_fn" '{}' "$old"
  call_new_get "$new_path" "$new"
  diff -u <(canon "$old") <(canon "$new")
  echo "PARITY_GREEN ${label}"
}

curl --fail --silent --show-error --max-time 30 \
  -H "apikey: ${PROD_PUBLISHABLE_KEY}" \
  "${CANARY_URL}/health" | jq -e '.ok == true and .canary == true and .env == "PROD"' >/dev/null

echo 'CANARY_HEALTH_GREEN'

compare_pair profile fenix_prod_profile_get_user /v2/profile
compare_pair socials fenix_prod_profile_socials_get_user /v2/profile/socials
compare_pair people fenix_prod_chat_people_user /v2/chat/people
compare_pair conversations fenix_prod_chat_conversations_user /v2/chat/conversations

if [ -n "${CEREBRO_E2E_CONVERSATION_CODE:-}" ]; then
  old="$tmp/messages.old.json"
  new="$tmp/messages.new.json"
  call_old fenix_prod_chat_list_v2_user "$(jq -nc --arg c "$CEREBRO_E2E_CONVERSATION_CODE" '{p_conversation_code:$c,p_limit:100}')" "$old"
  call_new_get "/v2/chat/conversations/${CEREBRO_E2E_CONVERSATION_CODE}/messages?limit=100" "$new"
  diff -u <(canon "$old") <(canon "$new")
  echo 'PARITY_GREEN chat_messages'
else
  echo 'PARITY_SKIPPED chat_messages reason=no_conversation_code'
fi

echo 'AUTHENTICATED_READ_PARITY_GREEN'
