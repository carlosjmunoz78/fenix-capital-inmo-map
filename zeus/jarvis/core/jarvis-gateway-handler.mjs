/** Universal JARVIS Gateway HTTP contract, framework-neutral. LAB only until live gates pass. */
const MAX_BODY_BYTES=16_384;
const response=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
function toHttp(error){const message=String(error?.message||'INTERNAL_ERROR');
 if(message==='AUTH_REQUIRED'||message==='AUTH_DENIED'||message==='OWNER_ROOT_REQUIRED')return 403;
 if(message==='MISSION_NOT_FOUND')return 404;
 if(message==='COMPANY_SCOPE_DENIED')return 403;
 if(message==='IDEMPOTENCY_CONFLICT'||message==='MISSION_REVISION_CONFLICT')return 409;
 if(message.endsWith('_INVALID'))return 400;
 return 500;
}
export function createJarvisGatewayHandler({core, trustedAuthChannel=null}){
 if(!core?.submit||!core?.inspect||!core?.execute)throw new TypeError('CORE_REQUIRED');
 if(trustedAuthChannel!==null && (typeof trustedAuthChannel!=='string'||! /^[a-z0-9-]{2,80}$/.test(trustedAuthChannel)))throw new TypeError('TRUSTED_CHANNEL_INVALID');
 return async function handler(request){
  if(!(request instanceof Request))return response(400,{status:'ERROR',reason:'REQUEST_REQUIRED'});
  const pathname=new URL(request.url).pathname;
  if(request.method==='GET'&&pathname==='/v1/health')return response(200,{status:'LAB_ONLY',service:'jarvis-universal-gateway',ready:false});
  const bearer=request.headers.get('authorization')??'';
  if(!/^Bearer \S+$/i.test(bearer))return response(401,{status:'DENIED',reason:'AUTH_REQUIRED'});
  const token=trustedAuthChannel===null?bearer.slice(7):Object.freeze({channel:trustedAuthChannel,accessToken:bearer.slice(7)});
  const matched=pathname.match(/^\/v1\/missions\/([a-zA-Z0-9_-]{1,200})(\/execute)?$/);
  if(!((request.method==='POST'&&pathname==='/v1/missions')||(matched&&((request.method==='GET'&&!matched[2])||(request.method==='POST'&&matched[2])))))return response(404,{status:'CLOSED',reason:'ROUTE_NOT_FOUND'});
  try{
   if(request.method==='POST'&&pathname==='/v1/missions'){
    if(!/application\/json/i.test(request.headers.get('content-type')??''))return response(415,{status:'ERROR',reason:'JSON_CONTENT_TYPE_REQUIRED'});
    const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return response(413,{status:'ERROR',reason:'BODY_TOO_LARGE'});
    let input;try{input=JSON.parse(raw)}catch{return response(400,{status:'ERROR',reason:'INVALID_JSON'})};
    if(!input||typeof input!=='object'||Array.isArray(input))return response(400,{status:'ERROR',reason:'INVALID_BODY'});
    const result=await core.submit({token,companyId:input.company_id,projectId:input.project_id,intent:input.intent,idempotencyKey:input.idempotency_key,channel:input.channel,payload:input.payload});
    return response(result.replayed?200:201,{status:'OK',mission:result.mission,replayed:result.replayed});
   }
   if(request.method==='GET')return response(200,{status:'OK',mission:await core.inspect({token,missionId:matched[1]})});
   const result=await core.execute({token,missionId:matched[1]});return response(200,{status:'OK',mission:result.mission,replayed:result.replayed});
  }catch(error){const status=toHttp(error);return response(status,{status:'ERROR',reason:status===500?'INTERNAL_ERROR':String(error.message).slice(0,80)});}
 }
}