import { buildUniversalLearningEventReport } from '../../runtime/universal-learning-ingress.mjs';

function finite(value,label){const n=Number(value);if(!Number.isFinite(n))throw new Error(`${label}_required`);return n;}
function assertSafe(decision,golden){
  if(decision?.state_type!=='CEREBRO_HUMAN_INTELLIGENCE_TRIBUNAL_DECISION_V1')throw new Error('tribunal_decision_required');
  if(golden?.state_type!=='CEREBRO_HUMAN_INTELLIGENCE_FULL_GOLDEN_OLD_VS_NEW_V1')throw new Error('full_golden_required');
  if(decision.verdict!=='NEW_BETTER')throw new Error('new_better_required');
  if(decision.promotion?.prod_authorized!==false||decision.promotion?.prod_write_authorized!==false)throw new Error('authority_expansion_forbidden');
  if(golden.safety?.contains_customer_data!==false||golden.safety?.prod_write_authorized!==false||golden.safety?.trading_access!==false||Number(golden.safety?.additional_cost_eur)!==0)throw new Error('unsafe_golden_evidence');
}

export function buildHumanIntelligenceLearningSignal({decision,golden,version='1.0.0'}={}){
  assertSafe(decision,golden);
  const observedAt=String(golden.generated_at??'');
  if(Number.isNaN(Date.parse(observedAt)))throw new Error('golden_generated_at_required');
  const oldM=golden.old_metrics??{},newM=golden.new_metrics??{};
  const summary={
    verdict:decision.verdict,
    pairs_total:finite(golden.pairs_total,'pairs_total'),
    strict_quality_improvements:[...(decision.strict_quality_improvements??[])].slice(0,20),
    old:{duplicate_reply_rate:finite(oldM.duplicate_reply_rate,'old_duplicate'),question_rate:finite(oldM.signal_question_rate,'old_question'),ignored_concern_rate:finite(oldM.signal_ignored_concern_rate,'old_ignored'),acknowledged_concern_rate:finite(oldM.signal_acknowledged_concern_rate,'old_ack'),grounding_rate:finite(oldM.signal_grounding_rate,'old_grounding')},
    new:{duplicate_reply_rate:finite(newM.duplicate_reply_rate,'new_duplicate'),question_rate:finite(newM.signal_question_rate,'new_question'),ignored_concern_rate:finite(newM.signal_ignored_concern_rate,'new_ignored'),acknowledged_concern_rate:finite(newM.signal_acknowledged_concern_rate,'new_ack'),grounding_rate:finite(newM.signal_grounding_rate,'new_grounding')},
    canonical_rule_auto_promote:false
  };
  const evidenceIdentity=[
    new Date(observedAt).toISOString(),
    summary.pairs_total,
    summary.old.duplicate_reply_rate,summary.old.question_rate,summary.old.ignored_concern_rate,summary.old.acknowledged_concern_rate,summary.old.grounding_rate,
    summary.new.duplicate_reply_rate,summary.new.question_rate,summary.new.ignored_concern_rate,summary.new.acknowledged_concern_rate,summary.new.grounding_rate,
    summary.strict_quality_improvements.join(',')
  ].join(':');
  return Object.freeze({
    signal_id:`human-intelligence-tribunal:${version}:${decision.verdict}:${evidenceIdentity}`,
    signal_type:'TRIBUNAL_DECISION',
    company_id:'fenix',engine_id:'SIM-001',source_environment:'PREPROD',version,
    observed_at:new Date(observedAt).toISOString(),severity:'LOW',confidence:.99,risk_class:'LOW',
    reason:'Human Intelligence full 60x4 physical OLD-vs-NEW tribunal decision',
    hypothesis:'NEW conversational behavior should remain a bounded PREPROD learning candidate and be promoted only through existing regression, rollback and promotion gates.',
    metric:{name:'human_conversation_quality',direction:'HIGHER',measurement:'FULL_240_PAIRED_GOLDEN_AND_POST_PROMOTION_MONITORING'},
    evidence_refs:['artifact:full-golden-old-vs-new.v1.json','artifact:tribunal-decision.v1.json'],
    payload:{...summary,evidence_identity:evidenceIdentity},
    contains_customer_data:false,contains_secrets:false,additional_cost_eur:0,
    prod_authorized:false,prod_write_authorized:false,trading_access:false
  });
}

export function buildHumanIntelligenceLearningReport(input){
  const signal=buildHumanIntelligenceLearningSignal(input);
  return buildUniversalLearningEventReport({signals:[signal]});
}
