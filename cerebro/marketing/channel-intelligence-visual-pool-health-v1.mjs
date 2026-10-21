const DAY_MS = 86_400_000;

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function ts(value, label) {
  const raw = text(value, label, 80);
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) throw new TypeError(`${label} invalid timestamp`);
  return ms;
}

function normalizeChannels(value, label) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${label} non-empty array required`);
  return [...new Set(value.map((item, index) => text(item, `${label}[${index}]`, 80).toLowerCase()))];
}

function carouselNeeded(visualFormat) {
  return String(visualFormat).startsWith('carousel-');
}

function assetMatchesFormat(assetFormat, queueFormat) {
  const assetCarousel = String(assetFormat).startsWith('carousel');
  const queueCarousel = carouselNeeded(queueFormat);
  return queueCarousel ? assetCarousel : !assetCarousel;
}

function usedWithinCooldown({asset, scheduledMs, history}) {
  const cooldownDays = Number.isInteger(asset.cooldown_days) ? asset.cooldown_days : 60;
  const start = scheduledMs - cooldownDays * DAY_MS;
  return history.some((row) => {
    const priorMs = Date.parse(row.scheduled_at);
    if (!Number.isFinite(priorMs) || priorMs >= scheduledMs || priorMs < start) return false;
    return Array.isArray(row.source_media_urls) && row.source_media_urls.includes(asset.url);
  });
}

function characterUsedWithinCooldown({asset, scheduledMs, history, characterCooldownDays = 45}) {
  if (!asset.character_key) return false;
  const start = scheduledMs - characterCooldownDays * DAY_MS;
  return history.some((row) => {
    const priorMs = Date.parse(row.scheduled_at);
    if (!Number.isFinite(priorMs) || priorMs >= scheduledMs || priorMs < start) return false;
    return typeof row.character_key === 'string' && row.character_key.includes(asset.character_key);
  });
}

export function evaluateVisualPoolHealth({company_id, environment='PREPROD', queue, assets, now_ms=Date.now(), horizon_days=21, low_buffer=2} = {}) {
  const companyId = text(company_id, 'company_id', 160);
  const env = text(environment, 'environment', 40).toUpperCase();
  if (env !== 'PREPROD') throw new Error('POLICY_CONFLICT:VISUAL_POOL_HEALTH_PREPROD_ONLY');
  if (!Array.isArray(queue) || !Array.isArray(assets)) throw new TypeError('queue and assets arrays required');
  const now = Number(now_ms);
  if (!Number.isFinite(now)) throw new TypeError('now_ms invalid');
  const horizon = now + horizon_days * DAY_MS;
  const normalizedAssets = assets.filter((asset) => asset && asset.active === true && asset.company_id === companyId && String(asset.environment).toUpperCase() === env).map((asset, index) => Object.freeze({
    asset_key: text(asset.asset_key, `assets[${index}].asset_key`, 160),
    url: text(asset.url, `assets[${index}].url`, 1000),
    channels: normalizeChannels(asset.channel_eligible, `assets[${index}].channel_eligible`),
    visual_format: text(asset.visual_format, `assets[${index}].visual_format`, 100),
    character_key: asset.character_key == null ? null : text(asset.character_key, `assets[${index}].character_key`, 160),
    cooldown_days: Number.isInteger(asset.cooldown_days) ? asset.cooldown_days : 60
  }));

  const history = queue.filter((row) => row && row.company_id === companyId && String(row.environment).toUpperCase() === env);
  const upcoming = history.filter((row) => {
    const scheduledMs = Date.parse(row.scheduled_at);
    return Number.isFinite(scheduledMs) && scheduledMs >= now && scheduledMs < horizon && ['CONTENT_READY_MEDIA_REQUIRED','READY_PROVIDER','SCHEDULED'].includes(row.state);
  }).sort((a,b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));

  const checks = upcoming.map((row, index) => {
    const scheduledMs = ts(row.scheduled_at, `queue[${index}].scheduled_at`);
    const channel = text(row.channel, `queue[${index}].channel`, 80).toLowerCase();
    const format = text(row.visual_format, `queue[${index}].visual_format`, 100);
    const needed = carouselNeeded(format) ? 3 : 1;
    const eligible = normalizedAssets.filter((asset) => asset.channels.includes(channel) && assetMatchesFormat(asset.visual_format, format));
    const available = eligible.filter((asset) => !usedWithinCooldown({asset, scheduledMs, history}) && !characterUsedWithinCooldown({asset, scheduledMs, history}));
    const remaining = available.length - needed;
    const state = available.length < needed ? 'POOL_EXHAUSTED' : remaining < low_buffer ? 'POOL_LOW' : 'POOL_OK';
    return Object.freeze({
      content_key: text(row.content_key, `queue[${index}].content_key`, 200),
      channel,
      scheduled_at: new Date(scheduledMs).toISOString(),
      visual_format: format,
      needed_assets: needed,
      eligible_assets: eligible.length,
      available_assets: available.length,
      remaining_after_assignment: Math.max(0, remaining),
      state,
      expansion_required: state !== 'POOL_OK'
    });
  });

  const exhausted = checks.filter((item) => item.state === 'POOL_EXHAUSTED');
  const low = checks.filter((item) => item.state === 'POOL_LOW');
  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'VISUAL_ASSET_POOL_HEALTH_V1',
    company_id: companyId,
    environment: env,
    evaluated_at: new Date(now).toISOString(),
    horizon_days,
    upcoming_count: checks.length,
    exhausted_count: exhausted.length,
    low_count: low.length,
    overall_state: exhausted.length ? 'POOL_EXHAUSTED' : low.length ? 'POOL_LOW' : 'POOL_OK',
    next_action: exhausted.length ? 'EXPAND_FIRST_PARTY_VISUAL_POOL_BEFORE_DUE_DATE' : low.length ? 'PREPARE_VISUAL_POOL_EXPANSION' : 'NONE',
    checks: Object.freeze(checks),
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export const VISUAL_POOL_HEALTH_V1_CONTRACT = Object.freeze({
  environment: 'PREPROD',
  default_horizon_days: 21,
  visual_cooldown_respected: true,
  character_cooldown_days: 45,
  first_party_assets_preferred: true,
  auto_publish_authorized: false,
  external_side_effects: false,
  additional_cost_eur: 0
});
