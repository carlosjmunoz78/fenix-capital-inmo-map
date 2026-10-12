import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = path.resolve(__dirname, '../contracts/synthetic-human-population.v1.json');
const CONTRACT = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

function hashToInt(input, salt = '') {
  const digest = crypto.createHash('sha256').update(`${salt}|${input}`).digest();
  return digest.readUInt32BE(0);
}

function pick(values, seed, salt) {
  return values[hashToInt(seed, salt) % values.length];
}

function unit(seed, salt) {
  return hashToInt(seed, salt) / 0xffffffff;
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function strategyForSeed(seed) {
  return pick(CONTRACT.generation_strategies, seed, 'strategy');
}

const GENERIC_FACTS = [
  ['UNSTATED_CONSTRAINT','GENERIC_UNSTATED_CONSTRAINT'],
  ['PRIOR_BAD_EXPERIENCE','GENERIC_PRIOR_BAD_EXPERIENCE'],
  ['MISSING_DOCUMENT','GENERIC_MISSING_DOCUMENT'],
  ['CONFLICTING_COMMITMENT','GENERIC_CONFLICTING_COMMITMENT'],
  ['UNDECLARED_FINANCIAL_OBLIGATION','GENERIC_FINANCIAL_OBLIGATION'],
  ['PRIVATE_DECISION_CRITERION','GENERIC_PRIVATE_DECISION_CRITERION'],
  ['THIRD_PARTY_DEPENDENCY','GENERIC_THIRD_PARTY_DEPENDENCY'],
  ['PREVIOUS_CONTRADICTORY_ADVICE','GENERIC_CONTRADICTORY_ADVICE']
];

const DOMAIN_FACTS = {
  finance: [
    ['UNDECLARED_FINANCIAL_OBLIGATION','FIN_MONTHLY_DEBT'],
    ['UNSTATED_CONSTRAINT','FIN_SAVINGS_BUFFER'],
    ['UNSTATED_CONSTRAINT','FIN_VARIABLE_INCOME'],
    ['THIRD_PARTY_DEPENDENCY','FIN_COBORROWER_DEPENDENCY'],
    ['MISSING_DOCUMENT','FIN_MISSING_INCOME_DOCUMENT'],
    ['PREVIOUS_CONTRADICTORY_ADVICE','FIN_BANK_ADVICE_CONFLICT'],
    ['PRIOR_BAD_EXPERIENCE','FIN_PRIOR_BANK_SETBACK']
  ],
  legal: [
    ['MISSING_DOCUMENT','LEGAL_MISSING_DOCUMENT'],
    ['THIRD_PARTY_DEPENDENCY','LEGAL_THIRD_PARTY_SIGNATURE'],
    ['CONFLICTING_COMMITMENT','LEGAL_SIGNING_DEADLINE'],
    ['PREVIOUS_CONTRADICTORY_ADVICE','LEGAL_ADVICE_CONFLICT'],
    ['UNSTATED_CONSTRAINT','LEGAL_OWNERSHIP_UNCERTAINTY'],
    ['PRIOR_BAD_EXPERIENCE','LEGAL_PRIOR_DOCUMENT_PROBLEM']
  ],
  seo: [
    ['UNSTATED_CONSTRAINT','SEO_EXISTING_TRAFFIC_RISK'],
    ['MISSING_DOCUMENT','SEO_MEASUREMENT_ACCESS_MISSING'],
    ['CONFLICTING_COMMITMENT','SEO_CMS_CONSTRAINT'],
    ['PRIOR_BAD_EXPERIENCE','SEO_PRIOR_MIGRATION_DAMAGE'],
    ['THIRD_PARTY_DEPENDENCY','SEO_DEV_DEPENDENCY'],
    ['PRIVATE_DECISION_CRITERION','SEO_LOCAL_LEAD_PRIORITY']
  ],
  marketing: [
    ['UNSTATED_CONSTRAINT','MKT_ZERO_EXTRA_BUDGET'],
    ['CONFLICTING_COMMITMENT','MKT_LIMITED_TEAM_CAPACITY'],
    ['MISSING_DOCUMENT','MKT_CRM_DATA_GAP'],
    ['THIRD_PARTY_DEPENDENCY','MKT_APPROVAL_DEPENDENCY'],
    ['PRIOR_BAD_EXPERIENCE','MKT_PRIOR_CAMPAIGN_DISAPPOINTMENT'],
    ['PRIVATE_DECISION_CRITERION','MKT_QUALIFIED_LEAD_PRIORITY']
  ],
  social: [
    ['CONFLICTING_COMMITMENT','SOC_LIMITED_CONTENT_CAPACITY'],
    ['THIRD_PARTY_DEPENDENCY','SOC_APPROVAL_DEPENDENCY'],
    ['MISSING_DOCUMENT','SOC_ACCOUNT_ACCESS_MISSING'],
    ['PRIVATE_DECISION_CRITERION','SOC_BRAND_TONE_CONSTRAINT'],
    ['PRIOR_BAD_EXPERIENCE','SOC_PRIOR_ACCOUNT_PROBLEM'],
    ['UNSTATED_CONSTRAINT','SOC_CHANNEL_LIMIT']
  ],
  platform: [
    ['UNSTATED_CONSTRAINT','PLATFORM_LEGACY_DEPENDENCY'],
    ['CONFLICTING_COMMITMENT','PLATFORM_SHARED_RESOURCE_CONSTRAINT'],
    ['THIRD_PARTY_DEPENDENCY','PLATFORM_EXTERNAL_SERVICE_DEPENDENCY'],
    ['PRIVATE_DECISION_CRITERION','PLATFORM_ROLLBACK_REQUIRED'],
    ['PRIOR_BAD_EXPERIENCE','PLATFORM_PRIOR_OUTAGE'],
    ['PREVIOUS_CONTRADICTORY_ADVICE','PLATFORM_ARCHITECTURE_CONFLICT']
  ],
  multiempresa: [
    ['UNSTATED_CONSTRAINT','MULTI_LEGACY_STACK_MUST_SURVIVE'],
    ['MISSING_DOCUMENT','MULTI_ADMIN_ACCESS_MISSING'],
    ['CONFLICTING_COMMITMENT','MULTI_MIGRATION_WINDOW_CONSTRAINT'],
    ['THIRD_PARTY_DEPENDENCY','MULTI_OWNER_APPROVAL_DEPENDENCY'],
    ['PRIVATE_DECISION_CRITERION','MULTI_ZERO_COST_PRIORITY'],
    ['PRIOR_BAD_EXPERIENCE','MULTI_PRIOR_MIGRATION_FAILURE']
  ],
  newsletter: [
    ['MISSING_DOCUMENT','NEWSLETTER_LIST_QUALITY_GAP'],
    ['PRIVATE_DECISION_CRITERION','NEWSLETTER_AUDIENCE_SPLIT'],
    ['THIRD_PARTY_DEPENDENCY','NEWSLETTER_CONTENT_APPROVAL'],
    ['CONFLICTING_COMMITMENT','NEWSLETTER_FREQUENCY_CAPACITY'],
    ['PRIOR_BAD_EXPERIENCE','NEWSLETTER_PRIOR_DELIVERABILITY_ISSUE'],
    ['UNSTATED_CONSTRAINT','NEWSLETTER_CONSENT_CONSTRAINT']
  ],
  trading: [
    ['UNSTATED_CONSTRAINT','TRADING_ISOLATION_REQUIRED'],
    ['PRIVATE_DECISION_CRITERION','TRADING_LOSS_LIMIT_REQUIRED'],
    ['CONFLICTING_COMMITMENT','TRADING_RESOURCE_BOUNDARY'],
    ['THIRD_PARTY_DEPENDENCY','TRADING_BROKER_DEPENDENCY'],
    ['PRIOR_BAD_EXPERIENCE','TRADING_PRIOR_RUNTIME_FAILURE'],
    ['PREVIOUS_CONTRADICTORY_ADVICE','TRADING_STRATEGY_CONFLICT']
  ]
};

export function inferSyntheticScenarioDomain(scenario = {}) {
  const text = `${String(scenario?.scenario_id ?? '')} ${String(scenario?.initial_human_utterance ?? '')}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if(/\b(fin|hipoteca|financi|banco|deuda|prestamo|cuota|fein|tasacion)\b/.test(text)) return 'finance';
  if(/\b(legal|arras|herencia|compraventa|notari|registro|carga|titularidad)\b/.test(text)) return 'legal';
  if(/\b(seo|keyword|search console|gsc|indexacion|landing)\b/.test(text)) return 'seo';
  if(/\b(marketing|captacion|campana|conversion|clientes)\b/.test(text)) return 'marketing';
  if(/\b(social|redes|facebook|instagram|linkedin|tiktok|youtube)\b/.test(text)) return 'social';
  if(/\b(newsletter|brevo|email marketing)\b/.test(text)) return 'newsletter';
  if(/\b(platform|supabase|runtime|worker|gateway|arquitectura)\b/.test(text)) return 'platform';
  if(/\b(multi|multiempresa|empresa nueva|alta una empresa|onboarding)\b/.test(text)) return 'multiempresa';
  if(/\b(trading|broker|paper trading|kill switch)\b/.test(text)) return 'trading';
  return 'generic';
}

function buildHiddenFacts(seed, role, goalFamily, scenarioDomain = 'generic') {
  const pool = DOMAIN_FACTS[scenarioDomain] ?? GENERIC_FACTS;
  const count = 1 + (hashToInt(seed, 'hidden-count') % 2);
  return Array.from({ length: count }, (_, index) => {
    const [type, semanticKey] = pick(pool, seed, `hidden-type-${index}`);
    return {
      fact_id: `HF-${index + 1}`,
      type,
      semantic_key: semanticKey,
      scenario_domain: scenarioDomain,
      description_token: `${scenarioDomain}:${role}:${goalFamily}:hidden:${hashToInt(seed, `hidden-token-${index}`).toString(16)}`,
      revealed: false
    };
  });
}

function buildMisbeliefs(seed) {
  const types = [
    'NONE',
    'PROCESS_MISUNDERSTANDING',
    'OVERCONFIDENT_ASSUMPTION',
    'WRONG_CAUSAL_LINK',
    'OUTDATED_INFORMATION',
    'FALSE_EQUIVALENCE',
    'INCORRECT_EXPECTATION'
  ];
  const selected = pick(types, seed, 'misbelief');
  return selected === 'NONE' ? [] : [{
    misbelief_id: 'MB-1',
    type: selected,
    correction_threshold: 0.35 + Number((unit(seed, 'misbelief-threshold') * 0.45).toFixed(3))
  }];
}

function buildRevealRules(seed, hiddenFacts) {
  const triggers = [
    'USEFUL_QUESTION',
    'GROUNDING_CONFIRMATION',
    'CLEAR_PROPORTIONATE_EXPLANATION',
    'TRUST_ABOVE_THRESHOLD',
    'DIRECT_RELEVANT_QUESTION'
  ];
  return hiddenFacts.map((fact, index) => ({
    fact_id: fact.fact_id,
    trigger: pick(triggers, seed, `reveal-trigger-${index}`),
    threshold: 0.35 + Number((unit(seed, `reveal-threshold-${index}`) * 0.5).toFixed(3))
  }));
}

export function generateSyntheticHuman(seed, overrides = {}) {
  const dims = CONTRACT.dimensions;
  const role = overrides.role ?? pick(dims.role, seed, 'role');
  const goalFamily = overrides.goal_family ?? pick(dims.goal_family, seed, 'goal');
  const scenarioDomain = overrides.scenario_domain ?? 'generic';
  const hiddenFacts = buildHiddenFacts(seed, role, goalFamily, scenarioDomain);

  const privateState = {
    scenario_domain: scenarioDomain,
    private_goal: `${goalFamily}:private:${hashToInt(seed, 'private-goal').toString(16)}`,
    hidden_facts: hiddenFacts,
    misbeliefs: buildMisbeliefs(seed),
    reveal_rules: buildRevealRules(seed, hiddenFacts),
    success_condition: `RESOLUTION_${goalFamily}`,
    abandon_condition: pick([
      'FRICTION_ABOVE_0_90',
      'TRUST_BELOW_0_10',
      'UNRESOLVED_AFTER_MAX_TURNS',
      'BOUNDARY_VIOLATION'
    ], seed, 'abandon'),
    internal_state: {
      trust: clamp(0.25 + unit(seed, 'trust') * 0.65),
      cooperation: clamp(0.2 + unit(seed, 'cooperation') * 0.75),
      friction: clamp(unit(seed, 'friction') * 0.45),
      cognitive_load: clamp(0.1 + unit(seed, 'load') * 0.65),
      uncertainty: clamp(0.2 + unit(seed, 'uncertainty') * 0.7),
      patience: clamp(0.2 + unit(seed, 'patience') * 0.75)
    }
  };

  const profile = {
    profile_schema: 'CEREBRO_SYNTHETIC_HUMAN_PROFILE_V1',
    engine_id: 'SIM-001',
    environment: 'LAB',
    seed: String(seed),
    strategy: overrides.strategy ?? strategyForSeed(seed),
    dimensions: {
      role,
      life_context: overrides.life_context ?? pick(dims.life_context, seed, 'life-context'),
      knowledge_level: overrides.knowledge_level ?? pick(dims.knowledge_level, seed, 'knowledge'),
      technical_fluency: overrides.technical_fluency ?? pick(dims.technical_fluency, seed, 'technical'),
      conversation_style: overrides.conversation_style ?? pick(dims.conversation_style, seed, 'style'),
      cooperation_posture: overrides.cooperation_posture ?? pick(dims.cooperation_posture, seed, 'cooperation-posture'),
      urgency: overrides.urgency ?? pick(dims.urgency, seed, 'urgency'),
      adversariality: overrides.adversariality ?? pick(dims.adversariality, seed, 'adversariality'),
      privacy_posture: overrides.privacy_posture ?? pick(dims.privacy_posture, seed, 'privacy'),
      decision_style: overrides.decision_style ?? pick(dims.decision_style, seed, 'decision'),
      channel: overrides.channel ?? pick(dims.channel, seed, 'channel'),
      goal_family: goalFamily
    },
    observable_state: {
      explicit_facts_revealed: [],
      explicit_corrections: [],
      explicit_preferences: [],
      silence_or_no_response: false,
      accept_reject: null,
      human_request: null
    },
    private_state: privateState,
    longitudinal_state: {
      session_index: 1,
      revealed_facts: [],
      commitments: [],
      decisions: [],
      corrections: [],
      preferences: [],
      pending_items: [],
      last_interaction_summary: null
    },
    safety: { ...CONTRACT.safety }
  };

  return profile;
}

export function publicActorView(profile) {
  return {
    profile_schema: profile.profile_schema,
    engine_id: profile.engine_id,
    environment: profile.environment,
    seed: profile.seed,
    strategy: profile.strategy,
    dimensions: {
      role: profile.dimensions.role,
      channel: profile.dimensions.channel
    },
    observable_state: structuredClone(profile.observable_state),
    longitudinal_state: structuredClone(profile.longitudinal_state),
    safety: structuredClone(profile.safety)
  };
}

export function applyObservableEvent(profile, event) {
  if (!CONTRACT.transition_events.includes(event)) {
    throw new Error(`unsupported_transition_event:${event}`);
  }
  const next = structuredClone(profile);
  const s = next.private_state.internal_state;
  const delta = {
    USEFUL_QUESTION: { trust: 0.05, cooperation: 0.07, friction: -0.04, uncertainty: -0.05 },
    REPEATED_ANSWERED_QUESTION: { trust: -0.08, cooperation: -0.06, friction: 0.12, patience: -0.10 },
    ADMIT_REAL_ERROR: { trust: 0.11, cooperation: 0.05, friction: -0.08 },
    FALSE_CERTAINTY: { trust: -0.18, cooperation: -0.08, friction: 0.13, uncertainty: 0.08 },
    UNNECESSARY_PRESSURE: { trust: -0.11, cooperation: -0.13, friction: 0.15, patience: -0.06 },
    CLEAR_PROPORTIONATE_EXPLANATION: { trust: 0.06, cooperation: 0.04, cognitive_load: -0.08, uncertainty: -0.12 },
    EXCESSIVE_DETAIL: { cognitive_load: 0.16, patience: -0.09, friction: 0.04 },
    RESPECTFUL_BOUNDARY: { trust: 0.03, friction: -0.02 },
    GROUNDING_CONFIRMATION: { trust: 0.04, uncertainty: -0.07 },
    IGNORED_CONCERN: { trust: -0.10, cooperation: -0.07, friction: 0.11 }
  }[event];

  for (const [key, change] of Object.entries(delta)) {
    s[key] = clamp((s[key] ?? 0.5) + change);
  }

  for (const rule of next.private_state.reveal_rules) {
    const fact = next.private_state.hidden_facts.find(item => item.fact_id === rule.fact_id);
    if (!fact || fact.revealed) continue;
    const triggerMatch = rule.trigger === event || (rule.trigger === 'TRUST_ABOVE_THRESHOLD' && s.trust >= rule.threshold);
    if (triggerMatch && s.trust >= Math.min(rule.threshold, 0.9)) {
      fact.revealed = true;
      next.observable_state.explicit_facts_revealed.push({ fact_id: fact.fact_id, type: fact.type });
      next.longitudinal_state.revealed_facts.push({ fact_id: fact.fact_id, type: fact.type });
    }
  }

  return next;
}

export function advanceLongitudinalSession(profile, summary, pendingItems = []) {
  const next = structuredClone(profile);
  next.longitudinal_state.session_index += 1;
  next.longitudinal_state.last_interaction_summary = String(summary ?? '').slice(0, 500) || null;
  next.longitudinal_state.pending_items = Array.from(new Set(pendingItems.map(String))).slice(0, 20);
  next.observable_state = {
    explicit_facts_revealed: [],
    explicit_corrections: [],
    explicit_preferences: [],
    silence_or_no_response: false,
    accept_reject: null,
    human_request: null
  };
  return next;
}

export function coverageSignature(profile) {
  const d = profile.dimensions;
  return [
    d.role,
    d.goal_family,
    d.knowledge_level,
    d.conversation_style,
    d.cooperation_posture,
    d.urgency,
    d.privacy_posture,
    d.adversariality,
    d.channel
  ].join('|');
}

export function contract() {
  return structuredClone(CONTRACT);
}
