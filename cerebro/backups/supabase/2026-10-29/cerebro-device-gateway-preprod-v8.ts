import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const U = Deno.env.get("SUPABASE_URL") ?? "";
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SLUG = "/cerebro-device-gateway-preprod";

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-cerebro-env":"PREPROD"}
  });
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2,"0")).join("");
}

async function sha256Text(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i=0;i<a.length;i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

function routePath(req: Request) {
  const p = new URL(req.url).pathname;
  const i = p.indexOf(SLUG);
  return i >= 0 ? (p.slice(i + SLUG.length) || "/") : p;
}

async function body(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return {};
  try {
    const x = await req.json();
    return x && typeof x === "object" && !Array.isArray(x) ? x : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (!U || !S) return j({ok:false,error:"gateway_config_missing"},500);
    const path = routePath(req);
    if (req.method === "GET" && path === "/health") {
      return j({ok:true,status:"READY",environment:"PREPROD",durable_queue:true,custom_bearer_auth:true,nonce_replay_guard:true,scoped_delivery:true,one_time_enrollment:true,prod_allowed:false,parked:false,reason:"STEP4_PHYSICAL_ACCEPTANCE"});
    }

    if (req.method === "POST" && path === "/v1/agents/enroll") {
      const b:any = await body(req);
      const deviceId = String(b.device_id ?? "").trim();
      const companyId = String(b.company_id ?? "").trim();
      const environment = String(b.environment ?? "").trim().toUpperCase();
      const version = String(b.version ?? "").trim();
      const agentVersion = String(b.agent_version ?? "").trim();
      const pairCode = String(b.pair_code ?? "").trim();
      const tokenSha256 = String(b.token_sha256 ?? "").trim().toLowerCase();

      if (!deviceId || !companyId || !version || !agentVersion) return j({error:"enrollment_scope_required"},400);
      if (!["LAB","PREPROD"].includes(environment)) return j({error:"enrollment_environment_denied"},400);
      if (pairCode.length < 24 || !/^[a-f0-9]{64}$/.test(tokenSha256)) return j({error:"enrollment_proof_invalid"},400);

      const db = createClient(U,S,{auth:{persistSession:false}});
      const pairDigest = await sha256Text(pairCode);
      const {data:pair,error:pe} = await db.from("cerebro_device_pairings_preprod")
        .select("pairing_id,device_id,company_id,environment,version,expires_at,used_at")
        .eq("pair_code_sha256",pairDigest).maybeSingle();
      if (pe) return j({error:"enrollment_pairing_lookup_failed"},500);
      if (!pair) return j({error:"enrollment_pairing_unknown"},401);
      if (pair.used_at) return j({error:"enrollment_pairing_used"},409);
      if (new Date(pair.expires_at).getTime() < Date.now()) return j({error:"enrollment_pairing_expired"},401);
      if (pair.device_id !== deviceId || pair.company_id !== companyId || pair.environment !== environment || pair.version !== version) {
        return j({error:"enrollment_scope_mismatch"},401);
      }

      const {data:existing,error:ee} = await db.from("cerebro_device_agents_preprod")
        .select("device_id,company_id,environment,version,status,revoked_at")
        .eq("device_id",deviceId).maybeSingle();
      if (ee) return j({error:"enrollment_agent_lookup_failed"},500);
      if (existing && (existing.company_id !== companyId || existing.environment !== environment || existing.version !== version)) {
        return j({error:"enrollment_existing_scope_conflict"},409);
      }
      if (existing?.status === "REVOKED") return j({error:"enrollment_agent_revoked"},401);

      const agentRecord = {
        device_id:deviceId,company_id:companyId,environment,version,agent_version:agentVersion,
        token_sha256:tokenSha256,status:"ENROLLED",last_seen_at:null,revoked_at:null
      };
      const {error:ue} = await db.from("cerebro_device_agents_preprod").upsert(agentRecord,{onConflict:"device_id"});
      if (ue) return j({error:"enrollment_agent_store_failed"},500);

      const {error:me} = await db.from("cerebro_device_pairings_preprod")
        .update({used_at:new Date().toISOString()}).eq("pairing_id",pair.pairing_id).is("used_at",null);
      if (me) return j({error:"enrollment_pairing_finalize_failed"},500);

      return j({decision:"ENROLLED",device_id:deviceId,company_id:companyId,environment,version,stores_raw_token:false,prod_allowed:false});
    }

    const auth = req.headers.get("authorization") ?? "";
    const nonce = (req.headers.get("x-cerebro-nonce") ?? "").trim();
    if (!auth.startsWith("Bearer ")) return j({error:"transport_auth_required"},401);
    if (nonce.length < 12) return j({error:"transport_nonce_invalid"},400);
    const token = auth.slice(7).trim();
    if (token.length < 24) return j({error:"transport_auth_required"},401);

    const b:any = await body(req);
    const url = new URL(req.url);
    const deviceId = String(b.device_id ?? url.searchParams.get("device_id") ?? "").trim();
    if (!deviceId) return j({error:"transport_device_id_required"},400);

    const db = createClient(U,S,{auth:{persistSession:false}});
    const {data:agent,error:ae} = await db.from("cerebro_device_agents_preprod")
      .select("device_id,company_id,environment,version,agent_version,token_sha256,status,last_seen_at,revoked_at")
      .eq("device_id",deviceId).maybeSingle();
    if (ae) return j({error:"transport_agent_lookup_failed"},500);
    if (!agent) return j({error:"transport_agent_unknown"},401);
    if (agent.status === "REVOKED") return j({error:"transport_agent_revoked"},401);
    const digest = await sha256Text(token);
    if (!constantTimeEqual(digest, String(agent.token_sha256))) return j({error:"transport_auth_failed"},401);

    const {error:ne} = await db.from("cerebro_device_nonces_preprod").insert({device_id:deviceId,nonce});
    if (ne) return j({error:"transport_replay_detected"},401);

    await db.from("cerebro_device_nonces_preprod")
      .delete()
      .lt("used_at", new Date(Date.now() - 24*60*60*1000).toISOString());

    const heartbeatAt = new Date().toISOString();
    const {error:he} = await db.from("cerebro_device_agents_preprod")
      .update({status:"ONLINE",last_seen_at:heartbeatAt}).eq("device_id",deviceId);
    if (he) return j({error:"transport_heartbeat_failed"},500);

    if (req.method === "POST" && path === "/v1/agents/reconnect") {
      const now = new Date().toISOString();
      const {error:ue} = await db.from("cerebro_device_agents_preprod").update({status:"ONLINE",last_seen_at:now}).eq("device_id",deviceId);
      if (ue) return j({error:"transport_reconnect_failed"},500);
      const {count,error:ce} = await db.from("cerebro_device_commands_preprod")
        .select("*",{count:"exact",head:true}).eq("device_id",deviceId).eq("state","QUEUED");
      if (ce) return j({error:"transport_queue_count_failed"},500);
      return j({device_id:deviceId,company_id:agent.company_id,environment:agent.environment,version:agent.version,agent_version:agent.agent_version,status:"ONLINE",queued_commands:count ?? 0,stores_raw_token:false,prod_allowed:false});
    }

    if (req.method === "GET" && path === "/v1/agents/poll") {
      const now = new Date();
      const nowIso = now.toISOString();

      await db.from("cerebro_device_commands_preprod")
        .update({state:"QUEUED",delivered_at:null,lease_until:null})
        .eq("device_id",deviceId)
        .eq("state","DELIVERED")
        .lt("lease_until",nowIso);

      const legacyCutoff = new Date(now.getTime() - 2*60*1000).toISOString();
      await db.from("cerebro_device_commands_preprod")
        .update({state:"QUEUED",delivered_at:null,lease_until:null})
        .eq("device_id",deviceId)
        .eq("state","DELIVERED")
        .is("lease_until",null)
        .lt("delivered_at",legacyCutoff);

      const {data:cmd,error:qe} = await db.from("cerebro_device_commands_preprod")
        .select("command_id,company_id,environment,device_id,engine_id,version,idempotency_key,payload,created_at,delivery_attempt")
        .eq("device_id",deviceId)
        .eq("company_id",agent.company_id)
        .eq("environment",agent.environment)
        .eq("version",agent.version)
        .eq("state","QUEUED").order("created_at",{ascending:true}).order("command_id",{ascending:true}).limit(1).maybeSingle();
      if (qe) return j({error:"transport_poll_failed"},500);
      if (!cmd) return j({commands:[],prod_allowed:false});

      const leaseUntil = new Date(now.getTime() + 90*1000).toISOString();
      const nextAttempt = Number(cmd.delivery_attempt ?? 0) + 1;
      const {data:delivered,error:de} = await db.from("cerebro_device_commands_preprod")
        .update({state:"DELIVERED",delivered_at:nowIso,lease_until:leaseUntil,delivery_attempt:nextAttempt})
        .eq("command_id",cmd.command_id).eq("state","QUEUED")
        .select("command_id").maybeSingle();
      if (de) return j({error:"transport_delivery_mark_failed"},500);
      if (!delivered) return j({commands:[],prod_allowed:false});

      return j({commands:[{...cmd,delivery_attempt:nextAttempt,lease_until:leaseUntil}],prod_allowed:false});
    }

    if (req.method === "POST" && path === "/v1/agents/result") {
      const commandId = String(b.command_id ?? "").trim();
      if (!commandId || !b.result || typeof b.result !== "object") return j({error:"transport_result_payload_invalid"},400);
      const resultJson = JSON.stringify(b.result);
      const resultSha = await sha256Text(resultJson);
      const {data:owned,error:oe} = await db.from("cerebro_device_commands_preprod")
        .select("command_id").eq("command_id",commandId).eq("device_id",deviceId)
        .eq("company_id",agent.company_id).eq("environment",agent.environment).eq("version",agent.version).maybeSingle();
      if (oe) return j({error:"transport_command_scope_lookup_failed"},500);
      if (!owned) return j({error:"transport_command_scope_mismatch"},403);
      const {data:existing,error:ee} = await db.from("cerebro_device_results_preprod").select("result_sha256").eq("command_id",commandId).maybeSingle();
      if (ee) return j({error:"transport_result_lookup_failed"},500);
      if (existing) {
        if (String(existing.result_sha256) !== resultSha) return j({error:"transport_result_conflict"},409);
        return j({decision:"RESULT_REUSED",command_id:commandId,result_sha256:resultSha,prod_allowed:false});
      }
      const {error:ie} = await db.from("cerebro_device_results_preprod").insert({
        command_id:commandId,device_id:deviceId,semantic_verified:Boolean(b.semantic_verified),result:b.result,result_sha256:resultSha
      });
      if (ie) return j({error:"transport_result_store_failed"},500);
      const {error:ce} = await db.from("cerebro_device_commands_preprod")
        .update({state:Boolean(b.semantic_verified) ? "COMPLETED" : "FAILED",completed_at:new Date().toISOString(),lease_until:null})
        .eq("command_id",commandId).eq("device_id",deviceId);
      if (ce) return j({error:"transport_command_complete_failed"},500);
      return j({decision:"RESULT_STORED",command_id:commandId,result_sha256:resultSha,semantic_verified:Boolean(b.semantic_verified),prod_allowed:false});
    }

    return j({error:"not_found"},404);
  } catch (e) {
    console.error("cerebro-device-gateway-preprod",e);
    return j({error:"gateway_exception"},500);
  }
});