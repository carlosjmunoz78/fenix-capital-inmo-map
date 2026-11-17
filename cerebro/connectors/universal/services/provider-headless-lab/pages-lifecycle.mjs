// FACT-001 Cloudflare Pages ephemeral LAB project lifecycle.
// Single immutable target, no Git source, custom domain, DNS, billing or App/CRM mutation.
// Invoked only AFTER signed short-lived GitHub OIDC is validated by the service.
// No dynamic provider paths or methods supplied by model commands.
export const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
export const NAME='cerebro-fact001-pages-e2e-lab-20261110';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/pages/projects';
const PROJECT=API+'/'+NAME;
async function request(http,token,method,url,payload){
 if(![API,PROJECT].includes(url)||!['GET','POST','PATCH','DELETE'].includes(method))throw Error('CLOUDFLARE_PAGES_SCOPE_DENIED');
 if(method==='POST'&&url!==API||method!=='POST'&&url===API)throw Error('CLOUDFLARE_PAGES_METHOD_DENIED');
 const r=await http(url,{
  method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(payload?{'Content-Type':'application/json'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{}),redirect:'error',signal:AbortSignal.timeout(12000)
 });
 if(method==='GET'&&r.status===404)return {absent:true};
 if(!r.ok)throw Error('CLOUDFLARE_PAGES_HTTP_'+r.status);
 if(method==='DELETE'&&r.status===204)return {deleted:true};
 let d;try{d=await r.json()}catch{throw Error('CLOUDFLARE_PAGES_JSON_INVALID');}
 if(d?.success!==true)throw Error('CLOUDFLARE_PAGES_API_DENIED');
 if(method==='DELETE')return {deleted:true};
 return d.result;
}
function assertOwned(p){
 if(!p||p.name!==NAME||!p.subdomain?.startsWith(NAME+'.')||p.source)throw Error('CLOUDFLARE_PAGES_OWNERSHIP_UNVERIFIED');
 if(!Array.isArray(p.domains)||p.domains.some(d=>d!==NAME+'.pages.dev'))throw Error('CLOUDFLARE_PAGES_CUSTOM_DOMAINS_PRESENT');
 if(p.latest_deployment)throw Error('CLOUDFLARE_PAGES_HAS_DEPLOYMENTS');
}
export async function verifyPagesLifecycle({token,http=fetch}={}){
 if(typeof token!=='string'||token.length<20||token.length>8192)throw Error('CLOUDFLARE_PAGES_CREDENTIAL_UNAVAILABLE');
 let created=false,deleted=false,readback=false,attempted=false;
 const existing=await request(http,token,'GET',PROJECT);
 if(!existing.absent)throw Error('CLOUDFLARE_PAGES_ALREADY_EXISTS');
 try{
  attempted=true;
  const p=await request(http,token,'POST',API,{name:NAME,production_branch:'main'});
  assertOwned(p);
  created=true;
  const read=await request(http,token,'GET',PROJECT);
  assertOwned(read);readback=true;
 }finally{
  if(attempted){
   // Reconcile an ambiguous POST response. Delete only the same known isolated project
   // if provider readback proves project name, subdomain, no Git, no custom domains.
   const last=await request(http,token,'GET',PROJECT);
   if(!last.absent){
    assertOwned(last);
    const removal=await request(http,token,'DELETE',PROJECT);
    if(removal.deleted!==true)throw Error('CLOUDFLARE_PAGES_DELETE_UNCONFIRMED');
    deleted=true;
   }
  }
 }
 const final=await request(http,token,'GET',PROJECT);
 if(!final.absent)throw Error('CLOUDFLARE_PAGES_RESIDUAL_PROJECT');
 if(!created||!readback||!deleted)throw Error('CLOUDFLARE_PAGES_LIFECYCLE_INCOMPLETE');
 return {status:'CLOUDFLARE_PAGES_LAB_CREATE_READ_DELETE_VERIFIED',resource_type:'pages_project',
  project:NAME,created,readback,deleted,verified_absent:true,production_resources_modified:0,
  external_domains_modified:0,git_repos_modified:0,deployments_created:0,credential_exposed:false};
}
