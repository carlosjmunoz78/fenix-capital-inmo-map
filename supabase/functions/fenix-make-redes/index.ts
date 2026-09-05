import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOTION_VERSION = "2022-06-28";
const SECRET_NAME = "NOTION_TOKEN_MAKE_REDES";

const PROTECTED_PAGE_IDS = new Set([
  "3b981b1a756d8103a90bf2c3881e8ee8",
  "3b981b1a756d8184886ee2b4937c2aad",
  "3b981b1a756d819a9170c1b2045cab01",
  "3b981b1a756d81478f96eebb00c23de3",
  "3ba81b1a756d818192b3ea13fbd6940b",
  "3ba81b1a756d81ba8bd9ce37ec15845f",
  "3bb81b1a756d815990a1e5f8c4b05773",
  "3bb81b1a756d81f5be5fd265354161ea",
  "3bb81b1a756d811b8cbacb97f370f500",
  "3bb81b1a756d81fab394de2418be5a5c",
  "3bb81b1a756d8104aaddef94fc5eb155",
  "3bb81b1a756d819dbd4bdc1214dbe4bc",
  "3ba81b1a756d81e39182d861d4435ea6",
  "3bb81b1a756d81278b0fe967c094320a",
  "3bb81b1a756d81d9a072ede8d2607347",
  "3bb81b1a756d8104bda5fdfe45ba4b0d",
  "3bb81b1a756d81c4971ee41c7aee9eb6",
  "3bb81b1a756d8167a634f23b409d1883",
  "3bb81b1a756d8144a5b1fbd2d032e5fb",
  "37581b1a756d8020a712f057c39460cf"
]);

const LEGACY_CRM_PARENT_IDS = new Set([
  // Data-source IDs (new Notion API shape)
  "37581b1a756d8145ae8c000b661e45e0",
  "37581b1a756d81619fab000bcb980eb2",
  "37581b1a756d8164927b000b18504dbb",
  "37581b1a756d81c2967b000b3da3a068",
  "37581b1a756d81068fbf000bf9eb4f54",
  "37581b1a756d81dfa57c000b16d5b977",
  "37581b1a756d81e89fc4000b42370927",
  "2cb4f1fb258a46ee80c118adcc68ead9",
  "df381b1a756d8392bd6b07ebb1bf06cc",
  // Database IDs (Notion-Version 2022-06-28 parent shape)
  "37581b1a756d8068ad7fd5a656ac2015",
  "37581b1a756d800f8592cf2c23cc5c3d",
  "37581b1a756d8097956bc1aef866710b",
  "37581b1a756d80509266fafa125396ac",
  "37581b1a756d803091eff46ac1a522d7",
  "37581b1a756d805b9fa3cd3206a4106f",
  "37581b1a756d80fa91a3d011e85fcf4d",
  "8cbb6aca69f44431b36797facabfae78",
  "37981b1a756d80428275e9fed5e281a9"
]);

function normalize(input: string): string {
  const matches = input.match(/[0-9a-fA-F]{32}/g);
  if (matches?.length) return matches[matches.length - 1].toLowerCase();
  return input.replace(/-/g, "").toLowerCase();
}
function dashed(input: string): string {
  const s = normalize(input);
  if (!/^[0-9a-f]{32}$/.test(s)) throw new Error("invalid_page_id");
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
async function notion(path: string, init: RequestInit = {}) {
  const token = Deno.env.get(SECRET_NAME);
  if (!token) return { ok: false, status: 503, body: { error: `${SECRET_NAME}_missing` } };
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, body };
}
function parentId(page: any): string {
  const p = page?.parent;
  if (!p || typeof p !== "object") return "";
  return normalize(String(p.data_source_id || p.database_id || ""));
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const route = url.pathname.split("/").filter(Boolean).pop();

    if (req.method === "GET" && route === "health") {
      return reply({
        ok: true,
        service: "fenix-make-redes",
        secret_configured: Boolean(Deno.env.get(SECRET_NAME)),
        notion_secret_name: SECRET_NAME,
        destructive_default: "dry-run",
        protected_pages: PROTECTED_PAGE_IDS.size,
        legacy_crm_write_guard: true,
        legacy_crm_parent_ids: LEGACY_CRM_PARENT_IDS.size
      });
    }

    if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
    const payload = await req.json().catch(() => ({}));
    const raw = String(payload.page_id || payload.page_url || "");
    const id = normalize(raw);
    if (!/^[0-9a-f]{32}$/.test(id)) return reply({ error: "invalid_page_id" }, 400);

    if (route === "inspect-page") {
      const r = await notion(`/pages/${dashed(id)}`);
      return reply(r, r.status);
    }

    if (route === "archive-page" || route === "restore-page") {
      if (PROTECTED_PAGE_IDS.has(id)) return reply({ error: "protected_page", page_id: dashed(id) }, 403);

      const current = await notion(`/pages/${dashed(id)}`);
      if (!current.ok) return reply({ error: "page_preflight_failed", page_id: dashed(id), upstream_status: current.status }, current.status);
      const pid = parentId(current.body);
      if (pid && LEGACY_CRM_PARENT_IDS.has(pid)) {
        return reply({ error: "legacy_crm_read_only", page_id: dashed(id), parent_id: dashed(pid) }, 403);
      }

      const action = route === "archive-page" ? "archive" : "restore";
      const archived = action === "archive";
      const dryRun = payload.dry_run !== false;
      if (dryRun) return reply({ ok: true, dry_run: true, action, page_id: dashed(id), legacy_crm_guard_checked: true });
      const r = await notion(`/pages/${dashed(id)}`, { method: "PATCH", body: JSON.stringify({ archived }) });
      return reply(r, r.status);
    }

    return reply({ error: "unknown_route" }, 404);
  } catch (e) {
    return reply({ error: "bridge_exception", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});