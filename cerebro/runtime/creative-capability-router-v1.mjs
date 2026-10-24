const CANONICAL_HUMAN_REQUIRED = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

function req(v, name, max=160) {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${name.toUpperCase()}_REQUIRED`);
  const out = v.trim();
  if (out.length > max) throw new Error(`${name.toUpperCase()}_TOO_LONG`);
  return out;
}

export function routeCreativeCapability(input = {}) {
  const companyId = req(input.company_id, 'company_id');
  const engineId = req(input.engine_id, 'engine_id');
  const environment = req(input.environment, 'environment').toUpperCase();
  const version = req(input.version, 'version');
  const mediaKind = req(input.media_kind, 'media_kind').toUpperCase();
  if (!['DESIGN','IMAGE','VIDEO'].includes(mediaKind)) throw new Error('CREATIVE_MEDIA_KIND_UNKNOWN');
  if (Number(input.expected_cost_eur || 0) !== 0) return Object.freeze({ok:false,status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT'});
  if (input.human_required_reason && !CANONICAL_HUMAN_REQUIRED.has(input.human_required_reason)) throw new Error('NON_CANONICAL_HUMAN_REQUIRED_REASON');

  const base = {
    company_id: companyId,
    engine_id: engineId,
    environment,
    version,
    media_kind: mediaKind,
    expected_cost_eur: 0,
    publish_authorized: false,
    cross_company_access: 'DENY'
  };

  if (mediaKind === 'VIDEO') {
    if (input.interactive_editor_required === true && environment !== 'PROD') {
      return Object.freeze({
        ok:true,
        status:'LAB_ROUTE',
        ...base,
        capability_id:'CREATIVE-VIDEO-EDITOR-V1',
        provider:'OpenCut-app/OpenCut',
        automation_truth:'UI_BUILD_GREEN_EDITOR_API_MCP_HEADLESS_UPSTREAM_PLANNED',
        execution_path:['CREATIVE-VIDEO-EDITOR-V1','DIGITAL-BUILD-MULTIMEDIA'],
        fallback:['HYPERFRAMES','OPENMONTAGE','FFMPEG']
      });
    }
    return Object.freeze({
      ok:true,
      status:'AUTHORIZED_EXISTING_VIDEO_PATH',
      ...base,
      capability_id:'DIGITAL-BUILD-MULTIMEDIA',
      execution_path:['HYPERFRAMES','OPENMONTAGE','FFMPEG'],
      opencut_status:'LAB_ONLY_UNTIL_AUTOMATION_PARITY'
    });
  }

  const canvaNativeNeed = input.canva_native_required === true || input.brand_kit_required === true || input.brand_template_required === true;
  if (canvaNativeNeed) {
    if (input.canva_binding_green === true) {
      return Object.freeze({ok:true,status:'AUTHORIZED_PROVIDER_ROUTE',...base,capability_id:'CREATIVE-CANVA-V1',provider:'CANVA'});
    }
    if (input.local_fallback_allowed !== false && environment !== 'PROD') {
      return Object.freeze({
        ok:true,
        status:'PREPROD_FALLBACK_WITH_CAPABILITY_GAP',
        ...base,
        capability_id:'CREATIVE-VISUAL-LOCAL-V1',
        provider:'clawnify/OpenDesign',
        unmet_native_requirement:'CANVA_OAUTH_OR_NATIVE_FEATURE_REQUIRED_FOR_FINAL_PARITY'
      });
    }
    return Object.freeze({ok:false,status:'HOLD_CANVA_BINDING_NOT_GREEN',...base});
  }

  if (input.prefer_local === true || input.zero_cost_first !== false) {
    if (environment === 'PROD' && input.local_visual_prod_green !== true) {
      return Object.freeze({ok:false,status:'HOLD_LOCAL_VISUAL_NOT_PROD_CERTIFIED',...base,capability_id:'CREATIVE-VISUAL-LOCAL-V1'});
    }
    return Object.freeze({ok:true,status:'AUTHORIZED_LOCAL_ROUTE',...base,capability_id:'CREATIVE-VISUAL-LOCAL-V1',provider:'clawnify/OpenDesign'});
  }

  if (input.canva_binding_green === true) {
    return Object.freeze({ok:true,status:'AUTHORIZED_PROVIDER_ROUTE',...base,capability_id:'CREATIVE-CANVA-V1',provider:'CANVA'});
  }

  return Object.freeze({ok:true,status:'AUTHORIZED_LOCAL_ROUTE',...base,capability_id:'CREATIVE-VISUAL-LOCAL-V1',provider:'clawnify/OpenDesign'});
}

export function futureCreativeBinding(input = {}) {
  return Object.freeze({
    status:'BINDING_CANDIDATE_ONLY',
    generated_by:'FACT-001',
    company_scope:req(input.company_scope || 'MULTI_COMPANY','company_scope'),
    engine_id:req(input.engine_id,'engine_id'),
    requested_media_kinds:Array.isArray(input.media_kinds) ? [...new Set(input.media_kinds.map(v => String(v).toUpperCase()))] : [],
    candidate_capabilities:['CREATIVE-CANVA-V1','CREATIVE-VISUAL-LOCAL-V1','DIGITAL-BUILD-MULTIMEDIA','CREATIVE-VIDEO-EDITOR-V1'],
    automatic_provider_authority:false,
    automatic_publish_authority:false,
    required_gates:['permissions','operation_allowlist','privacy','cost','tests','evaluation','tribunal','observability','rollback','backup','rebuild']
  });
}
