import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VERIFY_TOKEN = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("META_WHATSAPP_APP_SECRET") ?? "";

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

async function hmacSha256Hex(secret: string, body: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, body);
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token") ?? "";
    const challenge = url.searchParams.get("hub.challenge") ?? "";

    if (!VERIFY_TOKEN) return text("webhook_not_configured", 503);
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) return text(challenge, 200);
    return text("forbidden", 403);
  }

  if (req.method === "POST") {
    if (!APP_SECRET) return text("webhook_not_configured", 503);

    const signature = req.headers.get("x-hub-signature-256") ?? "";
    if (!signature.startsWith("sha256=")) return text("missing_signature", 401);

    const raw = new Uint8Array(await req.arrayBuffer());
    const expected = await hmacSha256Hex(APP_SECRET, raw);
    const received = signature.slice("sha256=".length).toLowerCase();
    if (!timingSafeEqualHex(received, expected)) return text("invalid_signature", 401);

    // Signature verified. Persisting inbound messages/statuses is a separate guarded step.
    return text("EVENT_RECEIVED", 200);
  }

  return text("method_not_allowed", 405);
});
