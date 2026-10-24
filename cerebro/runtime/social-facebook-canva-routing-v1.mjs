const CANVA_ANTI_BOT_PATTERNS = [
  /muy pronto podr[aá]s volver a dise[nñ]ar/i,
  /rayid\s*:/i,
  /cloudflare/i,
  /verify you are human/i,
  /checking your browser/i
];

const CANVA_MCP_URL = 'https://api.canva.com/connect/v1/mcp';
const MCP_REMOTE_PACKAGE = 'mcp-remote@0.15.2';

export function isCanvaAntiBotInterstitial(sample = '') {
  const text = String(sample || '');
  return CANVA_ANTI_BOT_PATTERNS.some((pattern) => pattern.test(text));
}

export function chooseCanvaExecutionRoute({
  browser_result = null,
  canva_oauth_ready = false,
  legal_terms_accepted = false,
  customer_oauth_consent = false
} = {}) {
  const sample = browser_result?.observed_text_sample || '';
  const blocked = isCanvaAntiBotInterstitial(sample);

  if (!blocked) {
    return Object.freeze({
      status: 'BROWSER_ALLOWED',
      route: 'BROWSER_1_HUMAN_OPERATOR',
      browser_human_pacing_required: true,
      anti_bot_evasion: false,
      publish_outside_canva: false
    });
  }

  if (!legal_terms_accepted) {
    return Object.freeze({
      status: 'HUMAN_REQUIRED',
      human_required: 'LEGAL_REQUIRED',
      route: 'CANVA_REMOTE_MCP',
      reason: 'CANVA_DEVELOPER_TERMS_NOT_ACCEPTED',
      anti_bot_evasion: false
    });
  }

  if (!customer_oauth_consent) {
    return Object.freeze({
      status: 'HUMAN_REQUIRED',
      human_required: 'CUSTOMER_HUMAN_REQUEST',
      route: 'CANVA_REMOTE_MCP',
      reason: 'CANVA_USER_OAUTH_CONSENT_REQUIRED',
      anti_bot_evasion: false
    });
  }

  if (!canva_oauth_ready) {
    return Object.freeze({
      status: 'HOLD_CANVA_OAUTH_NOT_READY',
      route: 'CANVA_REMOTE_MCP',
      anti_bot_evasion: false
    });
  }

  return Object.freeze({
    status: 'AUTHORIZED',
    route: 'CANVA_REMOTE_MCP',
    endpoint: CANVA_MCP_URL,
    bridge_package: MCP_REMOTE_PACKAGE,
    browser_human_pacing_required: false,
    anti_bot_evasion: false,
    publish_outside_canva: false
  });
}

export function canvaMcpRuntimeConfig() {
  return Object.freeze({
    server_url: CANVA_MCP_URL,
    bridge_package: MCP_REMOTE_PACKAGE,
    credential_source: 'CEREBRO_VAULT',
    client_id_env: 'CEREBRO_CANVA_MCP_CLIENT_ID',
    client_secret_env: 'CEREBRO_CANVA_MCP_CLIENT_SECRET',
    oauth_session_store: 'CEREBRO_VAULT_ENCRYPTED',
    allowed_domains: ['canva.com', 'canva.ai', 'api.canva.com'],
    required_plan_features: ['brand_kits', 'brand_templates', 'resize', 'autofill'],
    external_publish_authorized: false,
    incremental_cost_eur: 0
  });
}
