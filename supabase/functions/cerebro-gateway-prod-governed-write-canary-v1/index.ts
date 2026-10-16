import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nacl from "npm:tweetnacl@1.0.3";

const EXPECTED_BASE_SHA = "9baf5a1885d3fbd8fc18614fb3b867a49583f40f";
const CANARY_ID = "CEREBRO-PROD-GOVERNED-WRITE-E2E-CANARY-V1";
const RUNTIME_SLUG = "cerebro-governed-write-runtime-canary-v1";
const SIGNING_CONTEXT = "CEREBRO_GATEWAY_TO_PROD_GOVERNED_WRITE_CANARY_V1";
const KEY_ID = "cerebro-prod-governed-write-canary-v1";

function J(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function sha256Bytes(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return J({
      status: "READY",
      service: "cerebro-gateway-prod-governed-write-canary-v1",
      chain: ["CEREBRO_GATEWAY", "ACTGW-001", "PROD_GOVERNED_WRITE_RUNTIME", "GITHUB_PHYSICAL_CANARY"],
      fixed_action_only: true,
      expected_base_sha: EXPECTED_BASE_SHA,
      direct_main_write: false,
      merge: false,
      customer_data: false,
      additional_cost_target_eur: 0
    });
  }
  if (req.method !== "POST") return J({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const U = Deno.env.get("SUPABASE_URL") ?? "";
  const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!U || !S) return J({ ok: false, stage: "GATEWAY", error: "SERVER_CONFIG_MISSING" }, 503);

  const body = JSON.stringify({
    action_type: "CREATE_GOVERNED_CANARY",
    company_id: "fenix",
    engine_id: "ACTGW-001",
    environment: "PROD",
    version: "v1",
    expected_base_sha: EXPECTED_BASE_SHA,
    idempotency_key: CANARY_ID
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const seed = await sha256Bytes(S + "|" + SIGNING_CONTEXT);
  const kp = nacl.sign.keyPair.fromSeed(seed);
  const signature = nacl.sign.detached(new TextEncoder().encode(timestamp + "." + body), kp.secretKey);

  try {
    const res = await fetch(`${U}/functions/v1/${RUNTIME_SLUG}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cerebro-key-id": KEY_ID,
        "x-cerebro-timestamp": timestamp,
        "x-cerebro-signature-ed25519": b64(signature)
      },
      body,
      redirect: "manual"
    });
    const result = await res.json().catch(() => null);
    if (!res.ok || result?.ok !== true) {
      return J({
        ok: false,
        status: "RED",
        stage: "PROD_GOVERNED_WRITE_RUNTIME",
        runtime_http_status: res.status,
        result,
        executed_by: "CEREBRO_GATEWAY_CANARY",
        direct_main_write: false,
        merge: false
      }, res.status >= 400 && res.status < 600 ? res.status : 502);
    }
    return J({
      ok: true,
      status: "GREEN",
      executed_by: "CEREBRO_GATEWAY_CANARY",
      chain: ["CEREBRO_GATEWAY", "ACTGW-001", "PROD_GOVERNED_WRITE_RUNTIME", "GITHUB_PHYSICAL_CANARY"],
      result
    });
  } catch (e) {
    return J({
      ok: false,
      status: "RED",
      stage: "TRANSPORT",
      error: e instanceof Error ? e.message : String(e),
      executed_by: "CEREBRO_GATEWAY_CANARY"
    }, 502);
  }
});
