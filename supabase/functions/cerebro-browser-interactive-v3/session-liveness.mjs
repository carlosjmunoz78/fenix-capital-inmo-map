const TERMINAL_JOB_STATES=new Set(['SUCCEEDED','FAILED','CANCELLED','DEAD_LETTER']);

export function classifySessionReuseV3(session,{job_status=null,now_ms=Date.now()}={}){
  if(!session)return Object.freeze({reusable:false,reason:'NO_SESSION'});
  const expiresAt=Date.parse(String(session.expires_at||''));
  if(!Number.isFinite(expiresAt)||expiresAt<=now_ms)return Object.freeze({reusable:false,reason:'SESSION_EXPIRED'});
  if(String(session.state||'')==='CONNECTING'&&TERMINAL_JOB_STATES.has(String(job_status||'').toUpperCase())){
    return Object.freeze({reusable:false,reason:'CONNECTING_JOB_TERMINAL'});
  }
  return Object.freeze({reusable:true,reason:'ACTIVE_SESSION'});
}

export const BROWSER_SESSION_LIVENESS_V3_CONTRACT=Object.freeze({
  schema_version:'1.0.0',
  terminal_job_states:[...TERMINAL_JOB_STATES],
  missing_or_invalid_expiry_is_stale:true,
  connecting_terminal_job_is_stale:true
});
