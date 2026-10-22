import crypto from 'node:crypto';

const ALLOWED_HOSTS = new Set([
  'trends.google.com',
  'support.google.com',
  'developers.google.com',
  'developers.facebook.com',
  'developers.tiktok.com',
  'learn.microsoft.com'
]);

function text(value, label, max = 500) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function safeUrl(value, label) {
  const raw = text(value, label, 1000);
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error(`${label} must use https`);
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error(`${label} host not allowlisted`);
  return url.toString();
}

function hash(value, size = 32) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, size);
}

function decodeXml(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim();
}

function stripCdata(value) {
  return String(value).replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function extractTag(block, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? decodeXml(stripCdata(match[1])) : null;
}

function parseApproxTraffic(value) {
  if (value == null) return null;
  const compact = String(value).replaceAll(',', '').replaceAll('+', '').trim().toUpperCase();
  const match = compact.match(/^([0-9]+(?:\.[0-9]+)?)([KMB])?$/);
  if (!match) return null;
  const base = Number(match[1]);
  const mult = match[2] === 'K' ? 1_000 : match[2] === 'M' ? 1_000_000 : match[2] === 'B' ? 1_000_000_000 : 1;
  const out = Math.round(base * mult);
  return Number.isSafeInteger(out) ? out : null;
}

export function parseGoogleTrendsRss(xml) {
  const source = text(xml, 'xml', 5_000_000);
  const blocks = source.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  return Object.freeze(blocks.slice(0, 200).map((block, index) => {
    const title = extractTag(block, 'title');
    if (!title) throw new Error(`RSS item ${index} missing title`);
    const trafficRaw = extractTag(block, 'ht:approx_traffic');
    const pubDateRaw = extractTag(block, 'pubDate');
    const pubMs = pubDateRaw ? Date.parse(pubDateRaw) : NaN;
    return Object.freeze({
      title: title.slice(0, 240),
      approx_traffic: parseApproxTraffic(trafficRaw),
      published_at: Number.isFinite(pubMs) ? new Date(pubMs).toISOString() : null
    });
  }));
}

function validateRequest(request, collectorId) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new TypeError('collector request object required');
  if (request.collector_id !== collectorId) throw new Error('POLICY_CONFLICT:COLLECTOR_ID_MISMATCH');
  if (request.write_authorized !== false || request.publish_authorized !== false || request.spend_authorized !== false || request.prod_authorized !== false || Number(request.additional_cost_eur) !== 0) {
    throw new Error('POLICY_CONFLICT:COLLECTOR_REQUEST_AUTHORITY');
  }
  return Object.freeze({
    company_id: text(request.company_id, 'company_id', 160),
    collector_id: collectorId,
    watch_type: text(request.watch_type, 'watch_type', 80),
    channel_id: request.channel_id ?? null
  });
}

async function persistPayload(persist, payload) {
  if (persist == null) return null;
  if (typeof persist !== 'function') throw new TypeError('persist must be function');
  const ref = await persist(payload);
  return text(ref, 'payload_ref', 200);
}

function result({ctx, observedAt, signalCount, evidenceRef, payloadRef}) {
  return Object.freeze({
    company_id: ctx.company_id,
    collector_id: ctx.collector_id,
    watch_type: ctx.watch_type,
    channel_id: ctx.channel_id,
    observed_at: observedAt,
    signal_count: signalCount,
    evidence_ref: evidenceRef,
    payload_ref: payloadRef,
    read_only: true,
    external_side_effect_executed: false,
    write_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
}

export function createGoogleTrendsRssAdapter({
  collector_id,
  geo = 'ES',
  fetch_text,
  persist = null,
  clock = Date.now
} = {}) {
  const collectorId = text(collector_id, 'collector_id', 200);
  const geoCode = text(geo, 'geo', 8).toUpperCase();
  if (!/^[A-Z]{2}$/.test(geoCode)) throw new Error('geo must be ISO alpha-2');
  if (typeof fetch_text !== 'function') throw new TypeError('fetch_text function required');
  const url = safeUrl(`https://trends.google.com/trending/rss?geo=${geoCode}`, 'google trends rss url');
  return async function googleTrendsRssAdapter(request) {
    const ctx = validateRequest(request, collectorId);
    const xml = await fetch_text(Object.freeze({method:'GET', url, auth:'NONE', read_only:true}));
    const items = parseGoogleTrendsRss(xml);
    const payload = Object.freeze({
      provider: 'GOOGLE_TRENDS_TRENDING_NOW_RSS',
      source_family: 'SEARCH_PUBLIC_TRENDS',
      geo: geoCode,
      url,
      items
    });
    const payloadRef = await persistPayload(persist, payload);
    const observedAt = new Date(Number(clock())).toISOString();
    return result({ctx, observedAt, signalCount: items.length, evidenceRef:`evidence:google-trends-rss:${hash(JSON.stringify(payload))}`, payloadRef});
  };
}

export function createOfficialDocsFingerprintAdapter({
  collector_id,
  docs_url,
  provider,
  channel_id = null,
  fetch_text,
  persist = null,
  clock = Date.now
} = {}) {
  const collectorId = text(collector_id, 'collector_id', 200);
  const url = safeUrl(docs_url, 'docs_url');
  const providerName = text(provider, 'provider', 120);
  if (typeof fetch_text !== 'function') throw new TypeError('fetch_text function required');
  return async function officialDocsAdapter(request) {
    const ctx = validateRequest(request, collectorId);
    const body = await fetch_text(Object.freeze({method:'GET', url, auth:'NONE', read_only:true}));
    const doc = text(body, 'official docs body', 5_000_000);
    const digest = hash(doc, 64);
    const payload = Object.freeze({
      provider: providerName,
      source_family: 'PLATFORM_PUBLIC_DOCS',
      channel_id: channel_id ?? ctx.channel_id,
      url,
      content_sha256: digest,
      byte_length: Buffer.byteLength(doc, 'utf8')
    });
    const payloadRef = await persistPayload(persist, payload);
    return result({
      ctx,
      observedAt: new Date(Number(clock())).toISOString(),
      signalCount: 1,
      evidenceRef: `evidence:official-docs:${digest.slice(0, 32)}`,
      payloadRef
    });
  };
}

export const PUBLIC_READ_ADAPTERS_V1_CONTRACT = Object.freeze({
  environment: 'PREPROD',
  read_only: true,
  zero_auth_google_trends_rss: true,
  official_docs_fingerprint_only: true,
  allowed_hosts: Object.freeze([...ALLOWED_HOSTS].sort()),
  provider_writes_authorized: false,
  prod_authorized: false,
  additional_cost_eur: 0
});
