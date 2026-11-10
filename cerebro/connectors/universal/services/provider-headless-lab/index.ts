// FACT-001 permanent candidate shared LAB read broker (NOT PROD Gateway).
// No App / CRM data changes, domain routing, new databases, schedules or subscriptions.
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc,assertReadOrder,SCOPE} from './policy.mjs';
import {providerSpecs,readProviderInventory} from './provider.mjs';
import {generateCloudflareFactoryScaffold} from './cloudflare-scaffold.mjs';
const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(n:number,x:Record<string,unknown>)=>new Response(JSON.stringify(x),{status:n,headers});
const getBearer=(request:Request)=>{
 const s=request.headers.get('authorization')||'';
 return s.startsWith('Bearer ')?s.slice(7):'';
};
async function getVaultToken(name:string):Promise<string>{
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(!db)throw Error('VAULT_DATABASE_UNAVAILABLE');
 const sql=postgres(db,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 try{
  const values=await sql`select decrypted_secret from vault.decrypted_secrets where name=${name} limit 2`;
  if(values.length!==1||typeof values[0].decrypted_secret!=='string')throw Error('SERVICE_VAULT_TOKEN_MISSING');
  return values[0].decrypted_secret;
 } finally{await sql.end({timeout:2}).catch(()=>{});}
}

function assertPlanOrder(body:unknown){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('ORDER_INVALID');
 const b=body as Record<string,unknown>;
 const allowed=['company_id','engine_id','environment','version','client_id','source','operation','request_id','unit_type','unit_slug','required_resources'];
 if(JSON.stringify(Object.keys(b).sort())!==JSON.stringify(allowed.sort()))throw Error('PLAN_FIELDS_DENIED');
 if(b.company_id!=='fenix-capital'||b.engine_id!=='FACT-001'||b.environment!=='LAB'||b.version!=='1.0.0'||
    b.client_id!=='cerebro'||b.source!=='owner_order'||b.operation!=='factory.plan_internal_unit'||
    typeof b.request_id!=='string'||!/^FACT001-PLAN-[A-Z0-9-]{8,64}$/.test(b.request_id))throw Error('PLAN_SCOPE_DENIED');
 return {company_id:b.company_id,engine_id:b.engine_id,environment:b.environment,version:b.version,
   unit_type:b.unit_type,unit_slug:b.unit_slug,required_resources:b.required_resources};
}

Deno.serve(async request=>{
 try{
  const route=new URL(request.url).pathname.split('/').filter(Boolean).at(-1)||'';
  if(!['health','verify','plan'].includes(route))return reply(404,{status:'NOT_FOUND'});
  // Verify BEFORE parsing JSON or contacting Vault/provider.
  try{await verifyGitHubOidc(getBearer(request));}
  catch{return reply(401,{status:'UNAUTHORIZED'});}
  if(route==='health'&&request.method==='GET')return reply(200,{status:'SIGNED_HEADLESS_LAB_READY',scope:SCOPE});
  if(route==='plan'&&request.method==='POST'){
   if(Number(request.headers.get('content-length')||'0')>2000)return reply(413,{status:'PAYLOAD_TOO_LARGE'});
   let plan;
   try{plan=generateCloudflareFactoryScaffold(assertPlanOrder(await request.json()));}
   catch{return reply(400,{status:'PLAN_DENIED'});}
   return reply(200,{status:'FACT001_FACTORY_SCAFFOLD_GENERATED',
      scope:plan.plan.scope,unit:plan.plan.unit,resource_count:plan.plan.resources.length,
      files:plan.files,additional_cost_eur:0,provider_writes:0,
      provider_writes_enabled:false,rollback_required:true});
  }
  if(route==='verify'&&request.method==='POST'){
   if(Number(request.headers.get('content-length')||'0')>1600)return reply(413,{status:'PAYLOAD_TOO_LARGE'});
   let provider:string;
   try{provider=assertReadOrder(await request.json());}
   catch{return reply(400,{status:'ORDER_DENIED'});}
   let token='';
   try{
    token=await getVaultToken(providerSpecs[provider].secret);
    const result=await readProviderInventory({provider,token});
    return reply(200,result);
   }finally{token='';}
  }
  return reply(405,{status:'METHOD_NOT_ALLOWED'});
 }catch(e){
  const raw=e instanceof Error?e.message:'';
  const code=/^(UPSTREAM_AUTH_(401|403)|UPSTREAM_RATE_LIMIT|SERVICE_VAULT_TOKEN_MISSING|VAULT_DATABASE_UNAVAILABLE|UPSTREAM_UNVERIFIED_LIST|UPSTREAM_UNEXPECTED_SHAPE|CLOUDFLARE_UNSUCCESSFUL)$/.test(raw)?raw:'BROKER_ERROR';
  // Never log JWT, bearer, Vault values, upstream response or request body.
  console.warn('FACT001_HEADLESS_BROKER='+code);
  return reply(503,{status:'BLOCKED',code,credentials_exposed:false});
 }
});
