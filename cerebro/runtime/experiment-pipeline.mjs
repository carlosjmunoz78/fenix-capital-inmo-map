import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export const EXPERIMENT_ENVIRONMENTS=Object.freeze(["LAB","PREPROD","SHADOW"]);
export const DATASET_KINDS=Object.freeze(["HISTORICAL","SYNTHETIC","HOLDOUT"]);

export function defineExperiment({
  company_id,engine_id,hypothesis,baseline_version,candidate_version,
  metrics,controls=[],dataset_kind="HISTORICAL",environment="LAB",allow_prod_writes=false
}) {
  if(!company_id||!engine_id||!hypothesis) throw new Error("identity and hypothesis required");
  if(baseline_version===candidate_version) throw new Error("baseline and candidate must differ");
  if(!Array.isArray(metrics)||metrics.length===0) throw new Error("predefined metrics required");
  if(!EXPERIMENT_ENVIRONMENTS.includes(environment)) throw new Error("invalid experiment environment");
  if(!DATASET_KINDS.includes(dataset_kind)) throw new Error("invalid dataset kind");
  if(allow_prod_writes) throw new Error("experiment PROD writes forbidden");
  const experiment_id=stableIdempotencyKey({company_id,engine_id,hypothesis,baseline_version,candidate_version,metrics:[...metrics].sort(),controls,dataset_kind,environment});
  return {experiment_id,company_id,engine_id,hypothesis,baseline_version,candidate_version,metrics,controls,dataset_kind,environment,allow_prod_writes:false,state:"DEFINED"};
}

export function registerReplay({experiment,case_ids}) {
  if(!experiment?.experiment_id) throw new Error("experiment required");
  if(!Array.isArray(case_ids)||case_ids.length===0) throw new Error("replay cases required");
  return {
    replay_id:stableIdempotencyKey({experiment_id:experiment.experiment_id,case_ids:[...case_ids].sort()}),
    experiment_id:experiment.experiment_id,
    case_ids:[...new Set(case_ids)],
    state:"READY",
    writes_prod:false
  };
}

export function recordArmResult({experiment_id,arm,metrics,evidence_refs}) {
  if(!experiment_id) throw new Error("experiment_id required");
  if(!["OLD","NEW"].includes(arm)) throw new Error("arm must be OLD or NEW");
  if(!metrics||typeof metrics!=="object") throw new Error("metrics required");
  if(!Array.isArray(evidence_refs)||evidence_refs.length===0) throw new Error("evidence required");
  return {experiment_id,arm,metrics,evidence_refs,state:"MEASURED"};
}

export function compareArms({old_result,new_result,metric,direction="higher"}) {
  if(old_result?.arm!=="OLD"||new_result?.arm!=="NEW") throw new Error("OLD and NEW results required");
  const oldv=old_result.metrics?.[metric], newv=new_result.metrics?.[metric];
  if(typeof oldv!=="number"||typeof newv!=="number") throw new Error("numeric predefined metric required");
  if(!["higher","lower"].includes(direction)) throw new Error("invalid direction");
  const delta=newv-oldv;
  return {metric,old:oldv,new:newv,delta,better:direction==="higher"?delta>0:delta<0,equal:delta===0};
}
