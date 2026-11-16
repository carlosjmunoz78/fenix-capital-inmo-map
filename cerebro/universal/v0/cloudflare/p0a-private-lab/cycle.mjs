// CEREBRO P0-A · LAB only, API-only. Never log bearer tokens, emails, IDs or raw provider errors.
export const LAB_REF='hnqlnvakzaywtafeiybt';
const BASE='https://'+LAB_REF+'.supabase.co';
const ISSUER=BASE+'/auth/v1';
const INVALID_SID='00000000-0000-4000-8000-000000000002';
const INVALID_UID='00000000-0000-4000-8000-000000000001';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isKey=x=>typeof x==='string'&&x.length>=30&&!/\s/.test(x);
export const blocked=status=>Object.freeze({status,lab_only:true,prod_execution:'DISABLED',temp_user_cleanup:'NOT_NEEDED'});
function decodeClaims(token){
  try {
    const b64=token.split('.')[1];
    if(!b64)return null;
    const normalized=b64.replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'=')));
  }catch{return null;}
}
export function checkGate(env={}){
  if(env.CEREBRO_P0A_ENABLED!=='true')return blocked('BLOCKED_DISABLED');
  if(env.CEREBRO_LAB_PROJECT_REF!==LAB_REF)return blocked('BLOCKED_PROJECT_MISMATCH');
  if(!isKey(env.CEREBRO_LAB_SERVICE_ROLE_KEY)||!isKey(env.CEREBRO_LAB_PUBLISHABLE_KEY)
     ||env.CEREBRO_LAB_SERVICE_ROLE_KEY===env.CEREBRO_LAB_PUBLISHABLE_KEY)
    return blocked('BLOCKED_MISSING_LAB_SECRETS');
  // Filter by LAB/project and service_role before any network; remote RPC verifies credentials.
  const claim=decodeClaims(env.CEREBRO_LAB_SERVICE_ROLE_KEY);
  if(!claim||claim.ref!==LAB_REF||claim.role!=='service_role')
    return blocked('BLOCKED_ADMIN_KEY_SCOPE');
  if(!env.CEREBRO_LAB_PUBLISHABLE_KEY.startsWith('sb_publishable_'))
    return blocked('BLOCKED_PUBLIC_KEY_TYPE');
  return null;
}
function makeRequest(fetcher,apiKey,bearer,method,path,body){
  return fetcher(BASE+path,{method,
    headers:{apikey:apiKey,...(bearer?{Authorization:'Bearer '+bearer}:{}),
      ...(body!==undefined?{'Content-Type':'application/json'}:{})},
    ...(body!==undefined?{body:JSON.stringify(body)}:{}),
    signal:AbortSignal.timeout(15000)});
}
export async function runLabP0ACycle(env={},fetcher=fetch){
  const gate=checkGate(env);if(gate)return gate;
  const service=env.CEREBRO_LAB_SERVICE_ROLE_KEY,publicKey=env.CEREBRO_LAB_PUBLISHABLE_KEY;
  let userId=null,token=null,logoutDone=false,stage='PREFLIGHT',pass=false,cleanup='NOT_NEEDED';
  const call=async(key,bearer,method,path,body)=>{
    const response=await makeRequest(fetcher,key,bearer,method,path,body);
    if(!response.ok)throw Error('REMOTE_FAILURE');
    if(response.status===204)return null;
    const raw=await response.text();return raw?JSON.parse(raw):null;
  };
  const rpc=async(sid,uid)=>{
    const val=await call(service,service,'POST','/rest/v1/rpc/cerebro_operativa_session_guard_lab_v0',
      {p_session_id:sid,p_user_id:uid});
    if(typeof val!=='boolean')throw Error('RPC_RESULT_INVALID');
    return val;
  };
  try{
    if(await rpc(INVALID_SID,INVALID_UID)!==false)throw Error('RPC_NOT_SAFE');
    stage='CREATE';
    const email='cerebro-p0a-'+crypto.randomUUID().replace(/-/g,'')+'@fenixcapital.es';
    const password=crypto.randomUUID()+crypto.randomUUID()+crypto.randomUUID()+'Aa7!';
    const created=await call(service,service,'POST','/auth/v1/admin/users',
      {email,password,email_confirm:true,app_metadata:{cerebro_lab_only_test:'p0a_cf_workflow'}});
    if(UUID.test(created?.id||''))userId=created.id;
    if(!userId)throw Error('CREATE_MISSING_ID');
    stage='SIGN_IN';
    const login=await call(publicKey,null,'POST','/auth/v1/token?grant_type=password',{email,password});
    token=login?.access_token;
    if(typeof token!=='string'||token.length<30)throw Error('TOKEN_MISSING');
    stage='VERIFY_ISSUER';
    // Auth's official GET /user verifies access token; decoded claims alone are never trusted.
    const verified=await call(publicKey,token,'GET','/auth/v1/user');
    const claims=decodeClaims(token);
    if(!claims||verified?.id!==userId||claims.iss!==ISSUER||claims.sub!==userId||
        !UUID.test(claims.session_id||'')||claims.role!=='authenticated'||
        claims.aud!=='authenticated'||!Number.isFinite(claims.exp)||claims.exp*1000<=Date.now())
      throw Error('CLAIMS_MISMATCH');
    stage='NEGATIVE_CHECKS';
    if(await rpc(INVALID_SID,userId)!==false||await rpc(claims.session_id,INVALID_UID)!==false)
      throw Error('NEGATIVE_CHECKS_FAILED');
    stage='SESSION_ACTIVE';
    if(await rpc(claims.session_id,userId)!==true)throw Error('SESSION_NOT_FOUND');
    stage='LOGOUT';
    await call(publicKey,token,'POST','/auth/v1/logout?scope=local');logoutDone=true;
    stage='SESSION_REVOKED';
    let rejected=false;
    for(let n=0;n<3;n++){
      if(await rpc(claims.session_id,userId)===false){rejected=true;break;}
      if(n<2)await new Promise(r=>setTimeout(r,300));
    }
    if(!rejected)throw Error('SESSION_STILL_ACTIVE');
    pass=true;stage='COMPLETE';
  }catch{
    // Do not log or return remote exceptions: they may contain credentials and PII.
  }finally{
    if(token&&!logoutDone){
      try{await call(publicKey,token,'POST','/auth/v1/logout?scope=local');}
      catch{cleanup='FAILED';}
    }
    if(userId){
      try{await call(service,service,'DELETE','/auth/v1/admin/users/'+encodeURIComponent(userId));
        if(cleanup!=='FAILED')cleanup='SUCCESS';
      }catch{cleanup='FAILED';}
    }
  }
  return Object.freeze({status:pass&&cleanup!=='FAILED'?'PASS_LAB_ISSUER_ONLY':'FAIL_CLOSED',
    stage,lab_only:true,prod_execution:'DISABLED',temp_user_cleanup:cleanup});
}
