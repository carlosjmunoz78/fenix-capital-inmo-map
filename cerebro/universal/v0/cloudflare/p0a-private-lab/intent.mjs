/** Cloudflare Workflows REST API params may arrive as a JSON-encoded string. */
export function oneShotIntent(event) {
  const raw = event?.payload ?? event?.params;
  let params;
  if (typeof raw === 'string') {
    if (raw.length > 512) return false;
    try { params = JSON.parse(raw); } catch { return false; }
  } else {
    params = raw;
  }
  return Boolean(params && typeof params === 'object' && !Array.isArray(params) &&
    Object.keys(params).length === 1 && params.intent === 'LAB_AUTH_E2E_ONE_SHOT');
}
