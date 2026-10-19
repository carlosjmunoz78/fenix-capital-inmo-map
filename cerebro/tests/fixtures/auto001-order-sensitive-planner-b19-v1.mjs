import crypto from 'node:crypto';

function stable(parts){
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,16);
}

export function oldOrderSensitivePlannerB19(sourceMap,{baseSha='UNKNOWN',sourceText=null}={}){
  const eligible=(sourceMap.mappings??[]).find((m)=>
    m?.resolution?.status==='SOURCE_HINT_VERIFIED'&&
    m.resolution.repository==='carlosjmunoz78/fenix-capital-inmo-map'&&
    m.owner_engine==='HCI-001'&&
    m.dimension==='accessibility_semantics'&&
    String(m.target??'').startsWith('APP:')&&
    (m.resolution.file_hints??[]).includes('src/App.tsx')&&
    m.execution_authority?.prod_write_authorized===false
  );
  if(!eligible)return {status:'NO_ELIGIBLE_PATCH'};
  const pending=(sourceText?.match(/<div className="auth-shell">/g)??[]).length;
  if(pending!==2)return {status:'NO_ELIGIBLE_PATCH'};
  return {
    status:'PATCH_PLAN_READY',
    plan_id:`auto001:${stable([eligible.repair_id,eligible.case_id,eligible.dimension,'APP_AUTH_SHELL_ROLE_MAIN_V0',baseSha])}`,
    source_repair_id:eligible.repair_id,
    source_case_id:eligible.case_id,
    target:eligible.target
  };
}
