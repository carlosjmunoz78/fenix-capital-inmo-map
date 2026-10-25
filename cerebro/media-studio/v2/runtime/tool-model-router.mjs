const CLASS_ORDER={deterministic:0,oss_local:1,contracted_existing:2,free_tier:3,self_hosted:4,cheap_external:5,paid_burst_authorized:6};

function rejectCandidate(c,task){
  if(c.enabled===false) return 'disabled';
  if(c.license_ok!==true) return 'license';
  if(c.security_ok!==true) return 'security';
  if(task.identity_sensitivity==='REAL_PERSON'&&c.real_identity_allowed!==true) return 'identity_policy';
  if(task.privacy==='LOCAL_ONLY'&&c.execution_location!=='LOCAL') return 'privacy';
  if(Number.isFinite(task.cost_ceiling_eur)&&Number(c.estimated_cost_eur||0)>task.cost_ceiling_eur) return 'cost';
  if(task.requires_offline===true&&c.offline!==true) return 'offline';
  if(task.quality_target&&Number(c.quality_score||0)<Number(task.quality_target)) return 'quality';
  return null;
}

export function routeToolModel(task,candidates=[]){
  if(!task?.capability) throw new Error('capability required');
  const evaluated=candidates.map(c=>({...c,reject_reason:rejectCandidate(c,task)}));
  const eligible=evaluated.filter(c=>!c.reject_reason).sort((a,b)=>{
    const classDiff=(CLASS_ORDER[a.route_class]??99)-(CLASS_ORDER[b.route_class]??99);
    if(classDiff) return classDiff;
    const costDiff=Number(a.estimated_cost_eur||0)-Number(b.estimated_cost_eur||0);
    if(costDiff) return costDiff;
    return Number(b.quality_score||0)-Number(a.quality_score||0);
  });
  if(!eligible.length) return {decision:'HUMAN_REQUIRED',code:'LOW_CONFIDENCE',selected:null,evaluated};
  const selected=eligible[0];
  return {decision:'PASS',selected:{id:selected.id,route_class:selected.route_class,estimated_cost_eur:Number(selected.estimated_cost_eur||0),quality_score:Number(selected.quality_score||0)},fallback_chain:eligible.slice(1).map(c=>c.id),evaluated};
}

export function assertNoSilentSpend(result,max_cost=0){
  if(result?.decision!=='PASS') return result;
  if(Number(result.selected?.estimated_cost_eur||0)>max_cost) throw new Error('MONEY_LIMIT');
  return result;
}
