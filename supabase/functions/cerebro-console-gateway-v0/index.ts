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

const CONTRACT = {
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
  chat_mode: "DETERMINISTIC_READ_ONLY",
};

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

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function chatReply(message: string) {
  const text = normalize(message);
  if (!text) return { status:"INVALID", message:"Escribe una consulta.", executed:false };

  if (/\b(hola|ayuda|help|que puedes hacer)\b/.test(text)) {
    return {
      status:"OK", intent:"help", executed:false,
      message:"Estoy conectado en modo móvil seguro y solo lectura. Puedes preguntarme «estado», «motores» o «contrato». Las órdenes con cambios siguen bloqueadas hasta superar sus gates."
    };
  }
  if (/\b(estado|salud|health|conectado|conexion)\b/.test(text)) {
    return {
      status:"OK", intent:"health", executed:false,
      message:"CEREBRO Gateway está disponible por transporte autenticado. Este canal móvil está en LAB, sin escrituras PROD y sin acceso directo a modelos."
    };
  }
  if (/\b(motores|engines|motor)\b/.test(text)) {
    return {
      status:"OK", intent:"engines", executed:false,
      message:`Motores de Console V0 disponibles en el contrato: ${ENGINES.map(item=>item.engine_id).join(", ")}.`,
      available:ENGINES.map(item=>item.engine_id)
    };
  }
  if (/\b(contrato|seguridad|policy|politica|permisos)\b/.test(text)) {
    return {
      status:"OK", intent:"contract", executed:false,
      message:"Contrato móvil V0: Gateway obligatorio, acceso directo a modelos bloqueado, escrituras y ejecución PROD desactivadas, coste adicional objetivo 0 €."
    };
  }
  return {
    status:"HUMAN_REQUIRED",
    reason:"LOW_CONFIDENCE",
    intent:"unknown",
    executed:false,
    message:"Aún no tengo una ruta segura para esa petición en el canal móvil V0. Puedo responder «estado», «motores», «contrato» o «ayuda» sin ejecutar cambios."
  };
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
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "authorization,apikey,content-type",
          "access-control-max-age": "600",
          "vary": "origin",
        },
      });
    }

    const suffix = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";

    if (req.method === "POST" && suffix === "chat") {
      let body: unknown;
      try { body = await req.json(); } catch { return json(req, 400, { status:"INVALID", message:"JSON inválido.", executed:false }); }
      const message = typeof body === "object" && body !== null && "message" in body ? (body as {message?:unknown}).message : null;
      if (typeof message !== "string" || message.length > 1000) return json(req, 400, { status:"INVALID", message:"Mensaje inválido.", executed:false });
      return json(req, 200, chatReply(message));
    }

    if (req.method !== "GET") {
      return json(req, 405, {
        status: "CLOSED",
        reason: "READ_ONLY_SURFACE",
        detail: "Console V0 permits only GET reads and deterministic read-only POST /chat.",
      });
    }

    if (suffix === "health") {
      return json(req, 200, {
        status: "ok",
        service: "cerebro-console-gateway-v0",
        environment: "LAB",
        version: "0.2.0-mobile-readonly",
        authenticated_transport: true,
        direct_model_access: false,
        prod_execution_enabled: false,
        live_writes: false,
        chat_available: true,
        chat_mode: "DETERMINISTIC_READ_ONLY",
        additional_cost_target_eur: 0,
      });
    }

    if (suffix === "contract") return json(req, 200, CONTRACT);
    if (suffix === "engines") return json(req, 200, { engines: ENGINES });

    return json(req, 404, {
      status: "CLOSED",
      reason: "ROUTE_NOT_AVAILABLE",
      available: ["health", "contract", "engines", "chat"],
    });
  }),
};
