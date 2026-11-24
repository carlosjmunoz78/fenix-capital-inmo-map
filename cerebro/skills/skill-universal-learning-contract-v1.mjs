import {createHash} from 'node:crypto';
const policy={
  "version": "1.0.0",
  "mechanisms": {
    "M01_SCOUT": {
      "owner_skill": "cerebro-research",
      "required_evidence": "licensed_source_and_revision"
    },
    "M02_BASELINE": {
      "owner_skill": "cerebro-tribunal",
      "required_evidence": "baseline_case_receipt"
    },
    "M03_BASE_COMPARISON": {
      "owner_skill": "cerebro-tribunal",
      "required_evidence": "same_model_base_comparison"
    },
    "M04_EXTERNAL_COMPARISON": {
      "owner_skill": "cerebro-research",
      "required_evidence": "external_comparison_receipt"
    },
    "M05_CHAMPION_CHALLENGER": {
      "owner_skill": "cerebro-skill-evolution",
      "required_evidence": "paired_comparison_receipt"
    },
    "M06_FAILURE_LEARNING": {
      "owner_skill": "cerebro-learning",
      "required_evidence": "failure_observation_receipt"
    },
    "M07_SUCCESS_LEARNING": {
      "owner_skill": "cerebro-learning",
      "required_evidence": "success_observation_receipt"
    },
    "M08_TRANSFER": {
      "owner_skill": "cerebro-learning",
      "required_evidence": "scoped_transfer_receipt"
    },
    "M09_ADVERSARIAL": {
      "owner_skill": "cerebro-tribunal",
      "required_evidence": "adversarial_case_receipt"
    },
    "M10_BLIND_HOLDOUT": {
      "owner_skill": "cerebro-tribunal",
      "required_evidence": "independent_holdout_receipt"
    },
    "M11_OPTIMIZATION": {
      "owner_skill": "cerebro-zero-cost",
      "required_evidence": "quality_and_resource_comparison"
    },
    "M12_REGRESSION_PROMOTION": {
      "owner_skill": "cerebro-tribunal",
      "required_evidence": "regression_and_separate_release_decision"
    }
  },
  "arms": [
    "GPT_BASE",
    "CHAMPION",
    "EXTERNAL",
    "CHALLENGER"
  ],
  "additional_cost_eur": 0,
  "automatic_paid_fallback": false,
  "promotion_authorized": false,
  "environment": "LAB"
};
const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(sort(x))).digest('hex');
export const POLICY_SHA256=digest(policy);
if(POLICY_SHA256!=='225094152d5e676bddb52dde8238595d15b0baa6c7930fbd7e279ffd96da5fbc')throw Error('CP04_POLICY_DRIFT');
export const getLearningPolicy=()=>structuredClone(policy);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function learningBinding({identity,revision_sha256}={}){
 if(typeof identity!=='string'||!identity.trim()||identity.length>512||!hex(revision_sha256))return {status:'HOLD_IDENTITY_OR_REVISION',promotion_authorized:false,additional_cost_eur:0};
 return {status:'BOUND_NOT_RUN',identity,revision_sha256,policy_sha256:POLICY_SHA256,mechanisms:Object.fromEntries(Object.entries(policy.mechanisms).map(([k,v])=>[k,{...v,binding:'BOUND',execution:'NOT_RUN',receipt:null}])),arms:[...policy.arms],promotion_authorized:false,additional_cost_eur:0};
}
export function validateLearningBinding(b){
 const p=learningBinding({identity:b?.identity,revision_sha256:b?.revision_sha256});
 if(p.status!=='BOUND_NOT_RUN'||digest(p)!==digest(b))throw Error('CP04_BINDING_MISSING_OR_DRIFT');
 return true;
}
export function fourArmRequirements(binding){
 validateLearningBinding(binding);
 return {policy_sha256:POLICY_SHA256,arms:policy.arms.map(arm=>({arm,status:arm==='EXTERNAL'?'HOLD_EXTERNAL_SOURCE':arm==='CHAMPION'?'HOLD_INCUMBENT_RESOLUTION':'NOT_RUN'})),same_model_settings_permissions_budget_required:true,independent_holdout_required:true,additional_cost_eur:0,promotion_authorized:false};
}
