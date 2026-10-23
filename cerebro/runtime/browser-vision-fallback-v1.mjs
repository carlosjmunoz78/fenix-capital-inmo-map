const VISION_MODES = Object.freeze(['NONE','LOCAL','EXTERNAL']);

function bool(value) { return value === true; }
function num(value) { return Number.isFinite(value) ? Number(value) : 0; }

export function evaluateBrowserVisionFallback({
  dom_resolution = {},
  screenshot_evidence = {},
  provider = {},
  operation = {},
  confidence = 0,
  confidence_threshold = 0.92,
  engine_authority = {}
} = {}) {
  const mode = provider.mode || 'NONE';
  const base = {
    schema_version:'1.0.0',
    mode,
    vision_is_locator_not_authority:true,
    execution_authority_granted:false,
    target_resolution_authorized:false,
    human_required:null,
    additional_cost_eur:num(provider.incremental_spend_eur),
    status:'HOLD_VISION_NOT_READY'
  };

  if (dom_resolution.resolved === true) {
    return Object.freeze({...base,status:'NOT_NEEDED_DOM_RESOLVED'});
  }
  if (!VISION_MODES.includes(mode)) {
    return Object.freeze({...base,status:'HOLD_UNKNOWN_VISION_MODE'});
  }
  if (bool(operation.security_incident)) {
    return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'SECURITY_INCIDENT'});
  }
  if (bool(operation.high_risk)) {
    return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'HIGH_RISK'});
  }
  if (num(provider.incremental_spend_eur) > 0) {
    return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'MONEY_LIMIT'});
  }
  if (mode === 'NONE') {
    return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE'});
  }
  if (!screenshot_evidence.file || screenshot_evidence.fresh !== true) {
    return Object.freeze({...base,status:'HOLD_SCREENSHOT_EVIDENCE_NOT_FRESH'});
  }
  if (mode === 'EXTERNAL') {
    if (bool(provider.sensitive_data_present) || engine_authority.external_vision_authorized !== true) {
      return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'POLICY_CONFLICT'});
    }
  }
  if (!Number.isFinite(confidence) || confidence < confidence_threshold) {
    return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE'});
  }
  if (!provider.target || typeof provider.target !== 'object') {
    return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE'});
  }

  return Object.freeze({
    ...base,
    status:'AUTHORIZED_TARGET_ONLY',
    target_resolution_authorized:true,
    confidence,
    confidence_threshold,
    target:Object.freeze({...provider.target})
  });
}

export function getBrowserVisionFallbackCapabilities() {
  return Object.freeze({
    schema_version:'1.0.0',
    modes:[...VISION_MODES],
    dom_first:true,
    screenshot_required_when_used:true,
    paid_provider_required:false,
    local_provider_supported:true,
    external_provider_supported:true,
    vision_can_grant_execution_authority:false,
    low_confidence_human_required:'LOW_CONFIDENCE',
    paid_provider_human_required:'MONEY_LIMIT'
  });
}
