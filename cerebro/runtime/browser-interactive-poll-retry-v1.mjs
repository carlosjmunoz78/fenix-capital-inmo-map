const TRANSIENT_HTTP_STATUSES=new Set([408,425,429,500,502,503,504]);
const TRANSIENT_NETWORK_MARKERS=['fetch failed','ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN','UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET'];

function statusFromPollError(error){
  const message=String(error?.message||error||'');
  const match=message.match(/BROWSER_V3_WORKER_POLL_FAILED:(\d{3}):/);
  return match?Number(match[1]):null;
}

export function isTransientInteractivePollError(error){
  const status=statusFromPollError(error);
  if(status!==null)return TRANSIENT_HTTP_STATUSES.has(status);
  const message=String(error?.message||error||'');
  return TRANSIENT_NETWORK_MARKERS.some(marker=>message.includes(marker));
}

export function interactivePollRetryDelayMs(attempt,{base_delay_ms=300,max_delay_ms=3000}={}){
  const ordinal=Math.max(1,Number(attempt)||1);
  const base=Math.max(25,Number(base_delay_ms)||300);
  const cap=Math.max(base,Number(max_delay_ms)||3000);
  return Math.min(cap,Math.round(base*(2**(ordinal-1))));
}

export async function pollInteractiveWithRetry({poll,sleep,max_attempts=4,base_delay_ms=300,max_delay_ms=3000}={}){
  if(typeof poll!=='function')throw new Error('INTERACTIVE_POLL_FUNCTION_REQUIRED');
  if(typeof sleep!=='function')throw new Error('INTERACTIVE_POLL_SLEEP_REQUIRED');
  const attempts=Math.max(1,Math.min(Number(max_attempts)||4,8));
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt+=1){
    try{return await poll();}
    catch(error){
      lastError=error;
      if(!isTransientInteractivePollError(error)||attempt>=attempts)throw error;
      await sleep(interactivePollRetryDelayMs(attempt,{base_delay_ms,max_delay_ms}));
    }
  }
  throw lastError||new Error('INTERACTIVE_POLL_RETRY_EXHAUSTED');
}

export const BROWSER_INTERACTIVE_POLL_RETRY_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',
  transient_http_statuses:[408,425,429,500,502,503,504],
  default_max_attempts:4,
  auth_failures_retryable:false,
  security_failures_retryable:false,
  session_preserved_between_attempts:true,
  incremental_cost_eur:0
});
