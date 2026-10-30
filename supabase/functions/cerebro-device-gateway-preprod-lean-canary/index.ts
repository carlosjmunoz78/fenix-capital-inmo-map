import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const U = Deno.env.get("SUPABASE_URL") ?? "";
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CANARY_SLUG = "/cerebro-device-gateway-preprod-lean-canary";
const PREPROD = "PREPROD";
const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "cerebro-device-dispatch-v1";
const REPOSITORY = "carlosjmunoz78/fenix-capital-inmo-map";
const CANARY_REF = "refs/heads/cerebro/edge-device-dispatch-canary-v10-20261030";
const CANARY_WORKFLOW = ".github/workflows/cerebro-edge-device-dispatch-canary-v1.yml";
const CANARY_DEVICE_PREFIX = "gh-edge-canary-";
const EDGE_FRESH_MS = 90_000;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "authorization", "client_secret", "cookie", "password", "secret", "service_role",
  "service_role_key", "token", "access_token", "refresh_token"
]);

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-cerebro-env": PREPROD,
      "x-cerebro-canary": "EDGE-DISPATCH-V3",
    },
  });
}

function routePath(req: Request) {
  const p = new URL(req.url).pathname;
  const i = p.indexOf(CANARY_SLUG);
  return i >= 0 ? (p.slice(i + CANARY_SLUG.length) || "/") : p;
}

async function requestBody(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return {};
  try {
    const x = await req.json();
    return x && typeof x === "object" && !Array.isArray(x) ? x : {};
  } catch {
    return {};
  }
}

function nonEmpty(value: unknown, label: string, max = 512) {
  const out = String(value ?? "").trim();
  if (!out || out.length > max || out.includes("\0")) throw new Error(`${label}_invalid`);
  return out;
}

function stable(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map(k => [k, stable((value as Record<string, unknown>)[k])]));
}

function assertJsonSafePayload(value: unknown, path = "payload") {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("payload_object_required");
  const visit = (node: unknown, p: string) => {
    if (node === null || ["string", "number", "boolean"].includes(typeof node)) return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${p}[${index}]`));
      return;
    }
    if (typeof node !== "object") throw new Error("payload_json_safe_required");
    for (const [key, item] of Object.entries(node as Record<string, unknown>)) {
      if (FORBIDDEN_PAYLOAD_KEYS.has(key.toLowerCase())) throw new Error(`payload_secret_key_forbidden:${p}.${key}`);
      visit(item, `${p}.${key}`);
    }
  };
  visit(value, path);
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Text(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function githubCaller(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) throw new Error("github_oidc_required");
  const token = auth.slice(7).trim();
  const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUDIENCE });
  const repository = String(payload.repository ?? "");
  const ref = String(payload.ref ?? "");
  const workflowRef = String(payload.workflow_ref ?? "");
  const expectedWorkflowRef = `${REPOSITORY}/${CANARY_WORKFLOW}@${CANARY_REF}`;
  if (repository !== REPOSITORY) throw new Error("github_repository_denied");
  if (ref !== CANARY_REF) throw new Error("github_ref_denied");
  if (workflowRef !== expectedWorkflowRef) throw new Error("github_workflow_denied");
  const runId = nonEmpty(payload.run_id, "github_run_id", 64);
  return Object.freeze({ repository, ref, workflow_ref: workflowRef, run_id: runId });
}

function canaryDeviceId(runId: string) {
  return `${CANARY_DEVICE_PREFIX}${runId}`;
}

function assertPreprodScope(body: any) {
  const companyId = nonEmpty(body.company_id, "company_id", 128);
  const environment = nonEmpty(body.environment, "environment", 32).toUpperCase();
  const deviceId = nonEmpty(body.device_id, "device_id", 256);
  const engineId = nonEmpty(body.engine_id, "engine_id", 128);
  const version = nonEmpty(body.version, "version", 128);
  const idempotencyKey = nonEmpty(body.idempotency_key, "idempotency_key", 512);
  if (environment !== PREPROD) throw new Error("edge_dispatch_preprod_only");
  if (/trading/i.test(engineId)) throw new Error("edge_dispatch_trading_denied");
  return { companyId, environment, deviceId, engineId, version, idempotencyKey };
}

function edgeState(agent: any) {
  const lastSeenMs = agent?.last_seen_at ? Date.parse(String(agent.last_seen_at)) : 0;
  const fresh = Number.isFinite(lastSeenMs) && lastSeenMs > 0 && Date.now() - lastSeenMs <= EDGE_FRESH_MS;
  const ready = agent?.status === "ONLINE" && fresh && !agent?.revoked_at;
  return Object.freeze({
    placement: ready ? "EDGE" : "DEFERRED_EDGE",
    edge_status: ready ? "EDGE_READY" : "EDGE_OFFLINE",
    runnable_now: ready,
    queued_for_resume: !ready,
    human_required: false,
  });
}

async function proxyOld(req: Request, path: string) {
  const source = new URL(req.url);
  const target = `${U}/functions/v1/cerebro-device-gateway-preprod${path === "/" ? "" : path}${source.search}`;
  const headers = new Headers(req.headers);
  headers.delete("host");
  const init: RequestInit = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.arrayBuffer();
  const response = await fetch(target, init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("x-cerebro-canary-proxy", "V9");
  return new Response(await response.arrayBuffer(), { status: response.status, headers: responseHeaders });
}

Deno.serve(async (req: Request) => {
  try {
    if (!U || !S) return j({ ok: false, error: "gateway_config_missing" }, 500);
    const path = routePath(req);

    if (req.method === "GET" && path === "/health") {
      return j({
        ok: true,
        status: "READY",
        environment: PREPROD,
        mode: "V9_PROXY_PLUS_OIDC_EDGE_PRODUCER_CANARY",
        old_gateway_untouched: true,
        existing_device_queue_reused: true,
        offline_edge_persists_work: true,
        explicit_command_uuid: true,
        no_new_queue: true,
        no_new_scheduler: true,
        no_new_daemon: true,
        prod_allowed: false,
        trading_access: false,
        additional_cost_eur: 0,
      });
    }

    if (!path.startsWith("/v1/control/")) return proxyOld(req, path);
    if (req.method !== "POST") return j({ ok: false, error: "control_post_required" }, 405);

    const caller = await githubCaller(req);
    const db = createClient(U, S, { auth: { persistSession: false } });
    const body: any = await requestBody(req);

    if (path === "/v1/control/canary-fixture") {
      const deviceId = canaryDeviceId(caller.run_id);
      const tokenSha256 = await sha256Text(`synthetic-canary:${caller.run_id}`);
      const record = {
        device_id: deviceId,
        company_id: "fenix",
        environment: PREPROD,
        version: "edge-dispatch-canary-v1",
        agent_version: "synthetic-offline-canary-v1",
        token_sha256: tokenSha256,
        status: "OFFLINE",
        last_seen_at: null,
        revoked_at: null,
      };
      const { data, error } = await db.from("cerebro_device_agents_preprod")
        .insert(record)
        .select("device_id,company_id,environment,version,status,last_seen_at")
        .single();
      if (error) return j({ ok: false, error: "canary_fixture_insert_failed", detail: error.code }, 409);
      return j({ ok: true, fixture: data, run_id: caller.run_id, prod_allowed: false });
    }

    if (path === "/v1/control/enqueue") {
      const scope = assertPreprodScope(body);
      assertJsonSafePayload(body.payload);
      const payload = stable(body.payload);
      const payloadSha256 = await sha256Text(JSON.stringify(payload));

      const { data: agent, error: agentError } = await db.from("cerebro_device_agents_preprod")
        .select("device_id,company_id,environment,version,status,last_seen_at,revoked_at")
        .eq("device_id", scope.deviceId)
        .maybeSingle();
      if (agentError) return j({ ok: false, error: "edge_agent_lookup_failed" }, 500);
      if (!agent) return j({ ok: false, error: "edge_agent_unknown" }, 404);
      if (agent.revoked_at || agent.status === "REVOKED") return j({ ok: false, error: "edge_agent_revoked" }, 409);
      if (agent.company_id !== scope.companyId || agent.environment !== PREPROD || agent.version !== scope.version) {
        return j({ ok: false, error: "edge_agent_scope_mismatch" }, 409);
      }

      const existingQuery = () => db.from("cerebro_device_commands_preprod")
        .select("command_id,company_id,environment,device_id,engine_id,version,idempotency_key,payload_sha256,state,delivery_attempt,created_at,delivered_at,completed_at,lease_until")
        .eq("company_id", scope.companyId)
        .eq("environment", PREPROD)
        .eq("device_id", scope.deviceId)
        .eq("idempotency_key", scope.idempotencyKey)
        .maybeSingle();

      const { data: existing, error: existingError } = await existingQuery();
      if (existingError) return j({ ok: false, error: "edge_command_lookup_failed" }, 500);
      if (existing) {
        if (existing.engine_id !== scope.engineId || existing.version !== scope.version || existing.payload_sha256 !== payloadSha256) {
          return j({ ok: false, error: "edge_idempotency_conflict", command_id: existing.command_id }, 409);
        }
        return j({ ok: true, decision: "REUSED", command: existing, edge: edgeState(agent), prod_allowed: false });
      }

      const commandId = crypto.randomUUID();
      const { data: inserted, error: insertError } = await db.from("cerebro_device_commands_preprod")
        .insert({
          command_id: commandId,
          company_id: scope.companyId,
          environment: PREPROD,
          device_id: scope.deviceId,
          engine_id: scope.engineId,
          version: scope.version,
          idempotency_key: scope.idempotencyKey,
          payload,
          payload_sha256: payloadSha256,
          state: "QUEUED",
        })
        .select("command_id,company_id,environment,device_id,engine_id,version,idempotency_key,payload_sha256,state,delivery_attempt,created_at,delivered_at,completed_at,lease_until")
        .single();
      if (insertError) {
        if (insertError.code === "23505") {
          const { data: raced } = await existingQuery();
          if (raced && raced.engine_id === scope.engineId && raced.version === scope.version && raced.payload_sha256 === payloadSha256) {
            return j({ ok: true, decision: "REUSED_AFTER_RACE", command: raced, edge: edgeState(agent), prod_allowed: false });
          }
        }
        return j({ ok: false, error: "edge_command_insert_failed", detail: insertError.code }, 500);
      }
      return j({ ok: true, decision: "QUEUED", command: inserted, edge: edgeState(agent), prod_allowed: false });
    }

    if (path === "/v1/control/status") {
      const deviceId = nonEmpty(body.device_id, "device_id", 256);
      const idempotencyKey = nonEmpty(body.idempotency_key, "idempotency_key", 512);
      const { data, error } = await db.from("cerebro_device_commands_preprod")
        .select("command_id,company_id,environment,device_id,engine_id,version,idempotency_key,payload_sha256,state,delivery_attempt,created_at,delivered_at,completed_at,lease_until")
        .eq("device_id", deviceId)
        .eq("environment", PREPROD)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (error) return j({ ok: false, error: "edge_status_lookup_failed" }, 500);
      return j({ ok: true, command: data, prod_allowed: false });
    }

    if (path === "/v1/control/canary-cleanup") {
      const deviceId = canaryDeviceId(caller.run_id);
      if (!deviceId.startsWith(CANARY_DEVICE_PREFIX)) return j({ ok: false, error: "canary_cleanup_scope_denied" }, 403);
      const { data: commands, error: queryError } = await db.from("cerebro_device_commands_preprod")
        .select("command_id")
        .eq("device_id", deviceId)
        .eq("environment", PREPROD);
      if (queryError) return j({ ok: false, error: "canary_cleanup_query_failed" }, 500);
      const ids = (commands ?? []).map((row: any) => row.command_id);
      if (ids.length) {
        const { error: resultDeleteError } = await db.from("cerebro_device_results_preprod").delete().in("command_id", ids);
        if (resultDeleteError) return j({ ok: false, error: "canary_cleanup_results_failed" }, 500);
        const { error: commandDeleteError } = await db.from("cerebro_device_commands_preprod").delete().in("command_id", ids).eq("device_id", deviceId);
        if (commandDeleteError) return j({ ok: false, error: "canary_cleanup_commands_failed" }, 500);
      }
      const { error: agentDeleteError } = await db.from("cerebro_device_agents_preprod")
        .delete()
        .eq("device_id", deviceId)
        .eq("agent_version", "synthetic-offline-canary-v1");
      if (agentDeleteError) return j({ ok: false, error: "canary_cleanup_agent_failed" }, 500);
      return j({ ok: true, cleaned_device_id: deviceId, command_count: ids.length, prod_allowed: false });
    }

    return j({ ok: false, error: "control_route_not_found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const authFailure = message.startsWith("github_");
    return j({ ok: false, error: authFailure ? message : "edge_dispatch_canary_exception" }, authFailure ? 403 : 500);
  }
});
