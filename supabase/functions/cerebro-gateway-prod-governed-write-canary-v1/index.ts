import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BASE_SHA = "9baf5a1885d3fbd8fc18614fb3b867a49583f40f";

function J(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return J({
      status: "CLOSED_AFTER_CANARY",
      service: "cerebro-gateway-prod-governed-write-canary-v1",
      environment: "PROD_GOVERNED_WRITE_CANARY",
      expected_base_sha: EXPECTED_BASE_SHA,
      trigger_enabled: false,
      canary_result: "HUMAN_REQUIRED_POLICY_CONFLICT",
      blocker: "EXISTING_GITHUB_CREDENTIAL_NOT_BOUND",
      direct_main_write: false,
      merge: false,
      customer_data: false,
      additional_cost_eur: 0
    });
  }
  return J({
    ok: false,
    status: "CLOSED_AFTER_CANARY",
    error: "CANARY_TRIGGER_DISABLED",
    direct_main_write: false,
    merge: false
  }, 410);
});
