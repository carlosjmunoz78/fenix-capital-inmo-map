/** CEREBRO Universal read-only Gateway: preview and owner only. No PROD endpoint. */
import registry from '../cerebro/registry/engine-registry.v1.json' with { type: 'json' };
import {UniversalGatewayLabV0} from '../cerebro/universal/v0/control-plane.mjs';
import {createFenixOwnerContextResolverV0} from '../cerebro/universal/v0/owner-auth-adapter.mjs';
import {createGithubWorkActivityReaderV0} from '../cerebro/universal/v0/github-work-activity-reader.mjs';
import {createOwnerUniverseReaderLabV0} from '../cerebro/universal/v0/owner-universe-reader.mjs';
import {createJob001ControlReaderLabV0} from '../cerebro/universal/v0/job001-control-reader.mjs';

type H = string | string[] | undefined;
type Req={method?:string;url?:string;headers:Record<string,H>;body?:unknown};
type Res={status:(code:number)=>Res;setHeader:(name:string,value:string)=>void;json:(value:unknown)=>void};
const h=(v:H):string=>Array.isArray(v)?v[0]||'':v||'';
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const ACTIONS=new Set(['list_capabilities','get_capability','get_engine_status','invoke_read','get_evidence','list_work_activity','list_owner_sources','get_job001_controls','submit_command']);
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function allowedUniversalPreviewRequest(req:Req,environment:string|undefined,vercelUrl:string|undefined){
 const host=h(req.headers.host).toLowerCase();
 if(environment!=='preview'||!HOST.test(host))return false;
 // A safe alternate deployment hostname is legitimate when VERCEL_URL resolves
 // to a different immutable Preview hostname in the same allowlisted family.
 // Refuse arbitrary VERCEL_URL values. Still restrict request Host and owner.
 if(vercelUrl&&!HOST.test(vercelUrl.toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'')))return false;
 const origin=h(req.headers.origin);
 return !origin||origin==='https://'+host;
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 if(!allowedUniversalPreviewRequest(req,process.env.VERCEL_ENV,process.env.VERCEL_URL))
  return res.status(403).json({status:'CLOSED',reason:'PREVIEW_ONLY'});
 if(req.method!=='POST')return res.status(405).json({status:'CLOSED',reason:'METHOD_NOT_ALLOWED'});
 const bearer=h(req.headers.authorization),apikey=h(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey.length<12||apikey.length>256)
  return res.status(401).json({status:'CLOSED',reason:'AUTH_REQUIRED'});
 if(!obj(req.body)||typeof req.body.action!=='string'||!ACTIONS.has(req.body.action))
  return res.status(404).json({status:'CLOSED',reason:'READ_ACTION_NOT_ALLOWED'});
 const params=req.body.params;
 if(!obj(params)||params.company_id!=='fenix'||params.environment!=='LAB')
  return res.status(403).json({status:'CLOSED',reason:'COMPANY_OR_ENV_DENIED'});
 // A command can be structurally validated in LAB, never executed here.
 // The runtime has no write executor and this API refuses every non-dry-run request.
 if(req.body.action==='submit_command'){
  const p=params as Record<string,unknown>;
  if(p.dry_run!==true||p.engine_id!=='FACT-001'||p.capability_id!=='fact.registry.summary'||
   p.version!=='0.1.0-lab'||!obj(p.payload)||Object.keys(p.payload).length!==0||
   typeof p.idempotency_key!=='string'||!/^lab-[a-z0-9-]{12,48}$/.test(p.idempotency_key))
   return res.status(404).json({status:'CLOSED',reason:'LAB_DRYRUN_CONTRACT_REQUIRED'});
 }
 if(JSON.stringify(req.body).length>4096)
  return res.status(413).json({status:'CLOSED',reason:'REQUEST_TOO_LARGE'});
 try{
  // Session context is resolved server-side by the existing Fenix owner endpoint.
  // Publishable API key alone is NEVER authorization.
  const gateway=new UniversalGatewayLabV0({
   registry,authenticate:createFenixOwnerContextResolverV0({apiKey:apikey}),
   workActivity:createGithubWorkActivityReaderV0({apiKey:apikey}),
   ownerSources:createOwnerUniverseReaderLabV0({apiKey:apikey}),
   jobControls:process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY?.startsWith('sb_publishable_')?
    createJob001ControlReaderLabV0({preprodApiKey:process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY,ownerApiKey:apikey}):null
  });
  const result:unknown=await gateway.handle({
   session_token:bearer.replace(/^Bearer\s+/i,''),
   action:req.body.action,
   params
  });
  if(!obj(result))return res.status(502).json({status:'UNAVAILABLE'});
  return res.status(200).json({...result,transport:'PREVIEW_ONLY_SERVER_VERIFIED',source:['list_work_activity','list_owner_sources','get_job001_controls'].includes(req.body.action)?result.source:'LAB_REPOSITORY_SNAPSHOT_NOT_LIVE',prod_execution_enabled:false, ...(req.body.action==='submit_command'?{durable_audit:false,idempotency_persisted:false}: {})});
 }catch{
  // No upstream error, actor data, access token or headers ever returned to client.
  return res.status(403).json({status:'CLOSED',reason:'OWNER_AUTH_OR_POLICY_DENIED'});
 }
}
