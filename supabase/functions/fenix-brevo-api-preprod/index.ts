import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BASE = "https://api.brevo.com/v3";

async function brevo(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("api-key", BREVO_API_KEY);
  if (init.body) headers.set("content-type", "application/json");
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

async function webhookSignature() {
  const bytes = new TextEncoder().encode(`fenix-brevo-webhook:${BREVO_API_KEY}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async (req: Request) => {
  try {
    if (!BREVO_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) return Response.json({ok:false,error:"Missing server configuration"},{status:500});
    const url = new URL(req.url);
    const op = url.pathname.split("/").pop();

    if (req.method === "GET" && op === "account") {
      const r = await brevo("/account");
      if (!r.ok) return Response.json({ok:false,status:r.status,error:"Brevo account check failed"},{status:502});
      const plans = Array.isArray(r.data?.plan) ? r.data.plan.map((p:any)=>({type:p.type,credits:p.credits,creditsType:p.creditsType})) : [];
      const verticals = Array.isArray(r.data?.planVerticals) ? r.data.planVerticals.map((p:any)=>({planCategory:p.planCategory,planType:p.planType,name:p.name,status:p.status})) : [];
      return Response.json({ok:true,companyName:r.data?.companyName ?? null,enterprise:Boolean(r.data?.enterprise),plans,planVerticals:verticals});
    }

    if (req.method === "POST" && op === "contact-upsert") {
      const body = await req.json();
      const runId = String(body?.run_id ?? "").trim();
      const email = String(body?.email ?? "").trim().toLowerCase();
      if (!runId || !email) return Response.json({ok:false,error:"run_id and email required"},{status:400});
      const db = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: old } = await db.from("brevo_integration_runs_preprod").select("status,remote_id,detail").eq("run_id",runId).maybeSingle();
      if (old) return Response.json({ok:old.status==="success",idempotent:true,remote_id:old.remote_id,detail:old.detail});
      const payload:any = { email, updateEnabled:true, getId:true };
      if (body.attributes && typeof body.attributes === "object") payload.attributes = body.attributes;
      if (Array.isArray(body.listIds)) payload.listIds = body.listIds;
      const r = await brevo("/contacts", {method:"POST",body:JSON.stringify(payload)});
      const remoteId = r.data?.id != null ? String(r.data.id) : null;
      await db.from("brevo_integration_runs_preprod").insert({run_id:runId,operation:"contact-upsert",status:r.ok?"success":"error",remote_id:remoteId,detail:{status:r.status}});
      return Response.json({ok:r.ok,status:r.status,remote_id:remoteId},{status:r.ok?200:502});
    }

    if (req.method === "POST" && op === "setup-webhooks") {
      const db = createClient(SUPABASE_URL, SERVICE_ROLE);
      const runId = "brevo-webhooks-v1";
      const { data: old } = await db.from("brevo_integration_runs_preprod").select("status,detail").eq("run_id",runId).maybeSingle();
      if (old?.status === "success") return Response.json({ok:true,idempotent:true,detail:old.detail});
      const sig = await webhookSignature();
      const target = `${SUPABASE_URL}/functions/v1/fenix-brevo-webhook-preprod`;
      const definitions = [
        {type:"transactional",description:"Fenix CEREBRO PREPROD transactional",events:["sent","delivered","hardBounce","softBounce","blocked","spam","invalid","deferred","click","opened","uniqueOpened","unsubscribed"]},
        {type:"marketing",description:"Fenix CEREBRO PREPROD marketing",events:["spam","opened","click","hardBounce","softBounce","unsubscribed","listAddition","delivered","contactUpdated","contactDeleted"]}
      ];
      const ids:any[] = [];
      for (const d of definitions) {
        const r = await brevo("/webhooks", {method:"POST",body:JSON.stringify({...d,url:target,channel:"email",headers:[{key:"x-fenix-brevo-signature",value:sig}]})});
        if (!r.ok) {
          await db.from("brevo_integration_runs_preprod").upsert({run_id:runId,operation:"setup-webhooks",status:"error",detail:{status:r.status}},{onConflict:"run_id"});
          return Response.json({ok:false,error:"Webhook setup failed",status:r.status},{status:502});
        }
        ids.push({type:d.type,id:r.data?.id ?? null});
      }
      await db.from("brevo_integration_runs_preprod").upsert({run_id:runId,operation:"setup-webhooks",status:"success",detail:{webhooks:ids}},{onConflict:"run_id"});
      return Response.json({ok:true,webhooks:ids});
    }

    if (req.method === "POST" && op === "send-email") {
      const body = await req.json();
      if (body?.mode !== "PREPROD_TEST") return Response.json({ok:false,error:"PREPROD_TEST mode required"},{status:400});
      const runId = String(body?.run_id ?? "").trim();
      if (!runId) return Response.json({ok:false,error:"run_id required"},{status:400});
      const db = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: old } = await db.from("brevo_integration_runs_preprod").select("status,remote_id,detail").eq("run_id",runId).maybeSingle();
      if (old) return Response.json({ok:old.status==="success",idempotent:true,remote_id:old.remote_id,detail:old.detail});
      const payload:any = {to:body.to,subject:body.subject,tags:["FENIX_PREPROD",...(Array.isArray(body.tags)?body.tags:[])],headers:{"Idempotency-Key":runId}};
      if (body.templateId) payload.templateId = body.templateId;
      else { payload.sender = body.sender; payload.htmlContent = body.htmlContent; if (body.textContent) payload.textContent = body.textContent; }
      if (body.params) payload.params = body.params;
      if (Array.isArray(body.attachment)) {
        if (body.attachment.length > 1) return Response.json({ok:false,error:"single_attachment_only"},{status:422});
        const a = body.attachment[0];
        const name = String(a?.name ?? "");
        const content = String(a?.content ?? "");
        if (!/^[A-Za-z0-9._ -]{1,120}[.]pdf$/i.test(name) || !/^[A-Za-z0-9+/=]+$/.test(content) || content.length > 1500000) {
          return Response.json({ok:false,error:"invalid_attachment"},{status:422});
        }
        payload.attachment = [{name,content}];
      }
      const r = await brevo("/smtp/email", {method:"POST",body:JSON.stringify(payload)});
      const remoteId = r.data?.messageId ? String(r.data.messageId) : null;
      await db.from("brevo_integration_runs_preprod").insert({run_id:runId,operation:"send-email",status:r.ok?"success":"error",remote_id:remoteId,detail:{status:r.status}});
      return Response.json({ok:r.ok,status:r.status,message_id:remoteId},{status:r.ok?200:502});
    }

    return Response.json({ok:false,error:"Unknown operation"},{status:404});
  } catch (_) {
    return Response.json({ok:false,error:"Brevo adapter error"},{status:500});
  }
});