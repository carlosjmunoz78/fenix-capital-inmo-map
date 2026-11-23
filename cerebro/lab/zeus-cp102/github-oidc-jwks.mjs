// CP104 LAB: trusted GitHub OIDC discovery/JWKS with bounded refresh and fail-closed validation.
// No stored keys, tokens, extra credentials, routes, crons or D1 writes.
const ISSUER = 'https://token.actions.githubusercontent.com';
const DISCOVERY_URL = ISSUER + '/.well-known/openid-configuration';
const JWKS_URL = ISSUER + '/.well-known/jwks';
const MAX_JSON_BYTES = 65536;
const ACCEPT = { Accept: 'application/json', 'User-Agent': 'CEREBRO-ZEUS-LAB/0.1 (GitHub OIDC JWKS verifier)' };

function boundedJSON(response) {
  if (!response?.ok || response.redirected) throw Error('KEYS_FETCH');
  const length = response.headers?.get?.('content-length');
  if (length && Number(length) > MAX_JSON_BYTES) throw Error('JWKS_SIZE');
  return response.text().then(value => {
    if (new TextEncoder().encode(value).byteLength > MAX_JSON_BYTES) throw Error('JWKS_SIZE');
    try { return JSON.parse(value); }
    catch { throw Error('JWKS_FORMAT'); }
  });
}

export function createGithubOidcJwksLoader({
  fetcher = fetch,
  now = () => Date.now(),
  cacheTtlMs = 60000,
  refreshThrottleMs = 10000,
} = {}) {
  if (!Number.isInteger(cacheTtlMs) || cacheTtlMs < 1000 || cacheTtlMs > 300000) throw Error('CACHE_CONFIG');
  if (!Number.isInteger(refreshThrottleMs) || refreshThrottleMs < 0 || refreshThrottleMs > cacheTtlMs) throw Error('CACHE_CONFIG');
  let cached = null;
  let validUntil = 0;
  let lastAttemptAt = -Infinity;
  let pending = null;

  async function retrieve() {
    const request = async url => {
      let response;
      try {
        response = await fetcher(url, { method: 'GET', headers: ACCEPT, redirect: 'manual', signal: AbortSignal.timeout(8000) });
      } catch { throw Error('KEYS_FETCH'); }
      return boundedJSON(response);
    };
    const metadata = await request(DISCOVERY_URL);
    if (metadata?.issuer !== ISSUER || metadata?.jwks_uri !== JWKS_URL) throw Error('JWKS_DISCOVERY');
    const json = await request(JWKS_URL);
    if (!Array.isArray(json?.keys) || json.keys.length < 1 || json.keys.length > 32) throw Error('JWKS_FORMAT');
    const keys = json.keys.filter(k => k && k.kty === 'RSA' && k.use === 'sig' && k.alg === 'RS256'
      && typeof k.kid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(k.kid)
      && typeof k.n === 'string' && /^[A-Za-z0-9_-]{80,8192}$/.test(k.n)
      && typeof k.e === 'string' && /^[A-Za-z0-9_-]{2,32}$/.test(k.e));
    if (keys.length < 1 || new Set(keys.map(k => k.kid)).size !== keys.length) throw Error('JWKS_FORMAT');
    return {keys};
  }

  return async function loadGithubKeys(kid) {
    if (typeof kid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(kid)) throw Error('KEY');
    const time = now();
    const fresh = cached && time < validUntil;
    if (fresh && cached.keys.some(k => k.kid === kid)) return cached;
    if (fresh && time - lastAttemptAt < refreshThrottleMs) return cached;
    if (!pending) {
      lastAttemptAt = time;
      pending = retrieve().then(value => {
        cached = value;
        validUntil = now() + cacheTtlMs;
        return value;
      }).finally(() => { pending = null; });
    }
    // Reject instead of trusting expired keys when refresh fails.
    return pending;
  };
}
