import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const ALLOWED_ORIGINS = new Set([
  "https://app.fenixcapital.es",
  "https://www.app.fenixcapital.es",
]);

const ENGINES = [
  { engine_id: "CONSOLE-001", name: "CEREBRO Console", depends_on: ["ACTGW-001"] },
  { engine_id: "CHAT-001", name: "CEREBRO Chat", depends_on: ["CTX-001", "ACTGW-001"] },
  { engine_id: "CTX-001", name: "Context Selector", depends_on: [] },
  { engine_id: "CMD-001", name: "Command Executor", depends_on: ["CTX-001", "ACTGW-001"] },
  { engine_id: "ACTGW-001", name: "CEREBRO Action Gateway", depends_on: ["CTX-001"] },
];

function cors(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(req.headers.get("origin")) });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req) => {
    const origin = req.headers.get("origin");

    if (req.method === "OPTIONS") {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET,OPTIONS",
          "access-control-allow-headers": "authorization,apikey,content-type",
          "access-control-max-age": "600",
          "vary": "origin",
        },
      });
    }

    if (req.method !== "GET") {
      return json(req, 405, {
        status: "CLOSED",
        reason: "READ_ONLY_SURFACE",
        detail: "Console V0 HTTPS surface does not permit writes, commands, chat execution or model access.",
      });
    }

    const suffix = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";

    if (suffix === "health") {
      return json(req, 200, {
        status: "ok",
        service: "cerebro-console-gateway-v0",
        environment: "LAB",
        version: "0.1.0",
        authenticated_transport: true,
        direct_model_access: false,
        prod_execution_enabled: false,
        live_writes: false,
        additional_cost_target_eur: 0,
      });
    }

    if (suffix === "contract") {
      return json(req, 200, {
        environment: "LAB",
        gateway_required: true,
        direct_model_access: false,
        prod_execution_enabled: false,
        supabase_writes: false,
        live_writes: false,
        autonomous_prod: false,
        trading_access: false,
        additional_cost_target_eur: 0,
        required_context: ["company_id", "engine_id", "environment", "version"],
      });
    }

    if (suffix === "engines") return json(req, 200, { engines: ENGINES });

    return json(req, 404, {
      status: "CLOSED",
      reason: "ROUTE_NOT_AVAILABLE",
      available: ["health", "contract", "engines"],
    });
  }),
};
