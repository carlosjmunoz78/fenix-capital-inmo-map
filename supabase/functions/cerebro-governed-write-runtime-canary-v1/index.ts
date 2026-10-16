import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nacl from "npm:tweetnacl@1.0.3";

const OWNER = "carlosjmunoz78";
const REPO = "fenix-capital-inmo-map";
const BASE_BRANCH = "main";
const EXPECTED_BASE_SHA = "9baf5a1885d3fbd8fc18614fb3b867a49583f40f";
const CANARY_BRANCH = "cerebro/prod-governed-write-e2e-canary-v1";
const CANARY_PATH = "cerebro/evidence/prod-governed-write-e2e-canary-v1.json";
const CANARY_ID = "CEREBRO-PROD-GOVERNED-WRITE-E2E-CANARY-V1";
const SIGNING_CONTEXT = "CEREBRO_GATEWAY_TO_PROD_GOVERNED_WRITE_CANARY_V1";
const KEY_ID = "cerebro-prod-governed-write-canary-v1";

const artifact = JSON.stringify({
  schema_version: "1",
  evidence_id: CANARY_ID,
  company_id: "fenix",
  engine_id: "ACTGW-001",
  environment: "PROD",
  version: "v1",
  execution_mode: "PROD_GOVERNED_WRITE",
  expected_base_sha: EXPECTED_BASE_SHA,
  target_repository: `${OWNER}/${REPO}`,
  target_branch: CANARY_BRANCH,
  target_path: CANARY_PATH,
  safety: {
    direct_main_write: false,
    merge: false,
    auto_merge: false,
    force_push: false,
    workflow_mutation: false,
    governance_self_mutation: false,
    customer_data: false,
    trading: false,
    paid_fallback: false
  }
}, null, 2) + "\n";

function J(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function sha256Bytes(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function fromB64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function toB64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function verifyGateway(req: Request, bodyText: string) {
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRole) return { ok: false, error: "SERVER_SIGNING_CONFIG_MISSING" } as const;
  const keyId = req.headers.get("x-cerebro-key-id") ?? "";
  const timestamp = req.headers.get("x-cerebro-timestamp") ?? "";
  const signatureB64 = req.headers.get("x-cerebro-signature-ed25519") ?? "";
  if (keyId !== KEY_ID || !/^\d{10}$/.test(timestamp) || !signatureB64) {
    return { ok: false, error: "GATEWAY_SIGNATURE_HEADERS_INVALID" } as const;
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 120) return { ok: false, error: "GATEWAY_SIGNATURE_EXPIRED" } as const;
  const seed = await sha256Bytes(serviceRole + "|" + SIGNING_CONTEXT);
  const kp = nacl.sign.keyPair.fromSeed(seed);
  let signature: Uint8Array;
  try { signature = fromB64(signatureB64); } catch { return { ok: false, error: "GATEWAY_SIGNATURE_ENCODING_INVALID" } as const; }
  const message = new TextEncoder().encode(timestamp + "." + bodyText);
  if (!nacl.sign.detached.verify(message, signature, kp.publicKey)) return { ok: false, error: "GATEWAY_SIGNATURE_INVALID" } as const;
  return { ok: true } as const;
}

function githubCredential() {
  const candidates = [
    ["CEREBRO_GITHUB_TOKEN", Deno.env.get("CEREBRO_GITHUB_TOKEN")],
    ["GITHUB_TOKEN", Deno.env.get("GITHUB_TOKEN")],
    ["GH_TOKEN", Deno.env.get("GH_TOKEN")],
    ["GITHUB_PAT", Deno.env.get("GITHUB_PAT")]
  ] as const;
  for (const [name, value] of candidates) if (value) return { name, value };
  return null;
}

async function gh(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    redirect: "manual"
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return J({
      status: "READY",
      service: "cerebro-governed-write-runtime-canary-v1",
      environment: "PROD_GOVERNED_WRITE_CANARY",
      company_id: "fenix",
      engine_id: "ACTGW-001",
      version: "v1",
      fixed_action_only: true,
      direct_main_write: false,
      merge: false,
      customer_data: false,
      additional_cost_target_eur: 0
    });
  }
  if (req.method !== "POST") return J({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const bodyText = await req.text();
  const verified = await verifyGateway(req, bodyText);
  if (!verified.ok) return J({ ok: false, stage: "AUTHZ", error: verified.error }, 403);

  let body: any;
  try { body = JSON.parse(bodyText); } catch { return J({ ok: false, stage: "CONTRACT", error: "INVALID_JSON" }, 400); }
  const exact = body?.action_type === "CREATE_GOVERNED_CANARY" &&
    body?.company_id === "fenix" && body?.engine_id === "ACTGW-001" &&
    body?.environment === "PROD" && body?.version === "v1" &&
    body?.expected_base_sha === EXPECTED_BASE_SHA && body?.idempotency_key === CANARY_ID;
  if (!exact) return J({ ok: false, stage: "CONTRACT", error: "ACTION_NOT_ALLOWLISTED" }, 403);

  const credential = githubCredential();
  if (!credential) {
    return J({
      ok: false,
      stage: "CREDENTIAL_BROKER",
      error: "EXISTING_GITHUB_CREDENTIAL_NOT_BOUND",
      human_required: "POLICY_CONFLICT",
      new_credentials_created: false,
      message: "No existing GitHub runtime credential is bound; policy forbids creating one implicitly."
    }, 409);
  }

  const head = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BASE_BRANCH}`, credential.value);
  if (!head.res.ok || head.data?.object?.sha !== EXPECTED_BASE_SHA) {
    return J({ ok: false, stage: "BASE_LEASE", error: "BASE_SHA_MISMATCH", expected: EXPECTED_BASE_SHA, observed: head.data?.object?.sha ?? null, http_status: head.res.status }, 409);
  }

  let branchCreated = false;
  const branchRefPath = `/repos/${OWNER}/${REPO}/git/ref/heads/${CANARY_BRANCH.split("/").map(encodeURIComponent).join("/")}`;
  let branch = await gh(branchRefPath, credential.value);
  if (branch.res.status === 404) {
    const created = await gh(`/repos/${OWNER}/${REPO}/git/refs`, credential.value, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${CANARY_BRANCH}`, sha: EXPECTED_BASE_SHA })
    });
    if (!created.res.ok) return J({ ok: false, stage: "CREATE_BRANCH", error: "GITHUB_CREATE_BRANCH_REJECTED", http_status: created.res.status, detail: created.data?.message ?? null }, 502);
    branchCreated = true;
    branch = created;
  } else if (!branch.res.ok) {
    return J({ ok: false, stage: "READ_BRANCH", error: "GITHUB_BRANCH_READ_FAILED", http_status: branch.res.status }, 502);
  }

  let fileCreated = false;
  let fileSha: string | null = null;
  const contentsPath = `/repos/${OWNER}/${REPO}/contents/${encodePath(CANARY_PATH)}?ref=${encodeURIComponent(CANARY_BRANCH)}`;
  let file = await gh(contentsPath, credential.value);
  if (file.res.status === 404) {
    const put = await gh(`/repos/${OWNER}/${REPO}/contents/${encodePath(CANARY_PATH)}`, credential.value, {
      method: "PUT",
      body: JSON.stringify({
        message: "CEREBRO canary: physical governed-write E2E evidence",
        content: toB64Utf8(artifact),
        branch: CANARY_BRANCH
      })
    });
    if (!put.res.ok) return J({ ok: false, stage: "WRITE_FILE", error: "GITHUB_FILE_WRITE_REJECTED", http_status: put.res.status, detail: put.data?.message ?? null }, 502);
    fileCreated = true;
    fileSha = put.data?.content?.sha ?? null;
  } else if (file.res.ok) {
    const observed = String(file.data?.content ?? "").replace(/\s/g, "");
    if (observed !== toB64Utf8(artifact)) return J({ ok: false, stage: "IDEMPOTENCY", error: "CANARY_FILE_CONTENT_CONFLICT" }, 409);
    fileSha = file.data?.sha ?? null;
  } else {
    return J({ ok: false, stage: "READ_FILE", error: "GITHUB_FILE_READ_FAILED", http_status: file.res.status }, 502);
  }

  const params = new URLSearchParams({ state: "open", head: `${OWNER}:${CANARY_BRANCH}`, base: BASE_BRANCH, per_page: "10" });
  let prs = await gh(`/repos/${OWNER}/${REPO}/pulls?${params.toString()}`, credential.value);
  if (!prs.res.ok) return J({ ok: false, stage: "READ_PR", error: "GITHUB_PR_READ_FAILED", http_status: prs.res.status }, 502);
  let pr = Array.isArray(prs.data) ? prs.data[0] : null;
  let prCreated = false;
  if (!pr) {
    const opened = await gh(`/repos/${OWNER}/${REPO}/pulls`, credential.value, {
      method: "POST",
      body: JSON.stringify({
        title: "CEREBRO · PROD_GOVERNED_WRITE · physical E2E canary",
        head: CANARY_BRANCH,
        base: BASE_BRANCH,
        draft: true,
        body: "Physical canary created by CEREBRO Gateway → governed-write runtime. Fixed synthetic evidence only. No customer data, no workflow/governance mutation, no direct main write and no merge."
      })
    });
    if (!opened.res.ok) return J({ ok: false, stage: "CREATE_PR", error: "GITHUB_CREATE_PR_REJECTED", http_status: opened.res.status, detail: opened.data?.message ?? null }, 502);
    pr = opened.data;
    prCreated = true;
  }

  const readback = await gh(`/repos/${OWNER}/${REPO}/contents/${encodePath(CANARY_PATH)}?ref=${encodeURIComponent(CANARY_BRANCH)}`, credential.value);
  if (!readback.res.ok || String(readback.data?.content ?? "").replace(/\s/g, "") !== toB64Utf8(artifact)) {
    return J({ ok: false, stage: "READBACK", error: "PHYSICAL_READBACK_FAILED", http_status: readback.res.status }, 502);
  }

  return J({
    ok: true,
    status: "GREEN",
    canary_id: CANARY_ID,
    company_id: "fenix",
    engine_id: "ACTGW-001",
    environment: "PROD",
    version: "v1",
    execution_mode: "PROD_GOVERNED_WRITE",
    credential_source: credential.name,
    credential_value_exposed: false,
    base_sha_verified: true,
    expected_base_sha: EXPECTED_BASE_SHA,
    branch: CANARY_BRANCH,
    branch_created: branchCreated,
    file: CANARY_PATH,
    file_created: fileCreated,
    file_sha: fileSha,
    physical_readback: true,
    pr_number: pr?.number ?? null,
    pr_url: pr?.html_url ?? null,
    pr_created: prCreated,
    pr_draft: Boolean(pr?.draft),
    direct_main_write: false,
    merge: false,
    auto_merge: false,
    workflow_mutation: false,
    governance_self_mutation: false,
    customer_data: false,
    trading: false,
    additional_cost_eur: 0
  });
});
