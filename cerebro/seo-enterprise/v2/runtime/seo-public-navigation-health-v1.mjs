/** SEO-001 V1: bounded public website navigation monitoring in LAB.
 * Only sends HEAD to explicitly enumerated public URLs on fenixcapital.es.
 * No cookies, keys, forms, PII, CRM requests, staging, mutation or paid APIs.
 */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const approvedPaths=Object.freeze([
 '/','/aviso-legal/','/blog/','/calculadora-hipotecaria/','/inmobiliarias/','/contacto/',
 '/asesor-hipotecario-almeria/','/asesor-hipotecario-cadiz/','/asesor-hipotecario-cordoba/',
 '/asesor-hipotecario-granada/','/asesor-hipotecario-huelva/','/asesor-hipotecario-jaen/',
 '/asesor-hipotecario-malaga/','/asesor-hipotecario-sevilla/',
 '/comparador-hipoteca-fija-mixta-variable/','/obras-nuevas/',
 '/hipotecas/documentacion-para-pedir-una-hipoteca/','/antes-de-reservar/',
 '/hipotecas/hipoteca-100/','/quienes-somos/','/politica-de-cookies-ue/',
 '/declaracion-de-privacidad/','/hipotecas/requisitos-para-pedir-hipoteca/',
 '/deudas-antes-de-pedir-hipoteca/','/hipotecas/hipoteca-con-reforma/','/hipotecas/'
]);
const allow=new Set(approvedPaths);
const forbid=reason=>{throw new Error('SEO_NAV_GUARD_'+reason)};
function route(pathname){
 if(!allow.has(pathname)||pathname.includes('..')||pathname.includes('?')||pathname.startsWith('//'))
  forbid('PATH_NOT_ALLOWED');
 const url=new URL(pathname,'https://fenixcapital.es');
 if(url.origin!=='https://fenixcapital.es'||url.username||url.password||url.search||url.hash)
  forbid('ORIGIN_NOT_ALLOWED');
 return url.toString();
}
export async function checkPublicNavigation({
 paths=approvedPaths,fetchImpl=globalThis.fetch,concurrency=2,timeoutMs=8000
}={}){
 if(!Array.isArray(paths)||paths.length<1||paths.length>approvedPaths.length||
    new Set(paths).size!==paths.length||paths.some(x=>typeof x!=='string'||!allow.has(x)))
  forbid('SCOPE');
 if(typeof fetchImpl!=='function'||!Number.isSafeInteger(concurrency)||concurrency<1||concurrency>3||
    !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>15000)
  forbid('BOUNDS');
 const out=new Array(paths.length);
 let cursor=0;
 async function work(){
  while(cursor<paths.length){
   const index=cursor++,pathname=paths[index];
   let http=null,issue=null;
   try{
    const resp=await fetchImpl(route(pathname),{
      method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(timeoutMs),
      headers:{'user-agent':'Fenix-CEREBRO-SEO001-PublicNav/1.0'}
    });
    http=Number(resp.status);
    if(!Number.isInteger(http)||http<100||http>599){http=null;issue='INVALID_HTTP_STATUS'}
    else if(http!==200)issue=(http>=300&&http<400)?'REDIRECT_REVIEW':http>=400?'HTTP_ERROR':'OTHER_HTTP_STATUS';
   }catch{issue='NETWORK_UNVERIFIED'}
   out[index]={path:pathname,http,issue};
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,paths.length)},()=>work()));
 const valid=out.filter(x=>x.http===200).length,
   broken=out.filter(x=>x.issue==='HTTP_ERROR').length,
   redirects=out.filter(x=>x.issue==='REDIRECT_REVIEW').length,
   unverified=out.filter(x=>x.issue==='NETWORK_UNVERIFIED'||x.issue==='INVALID_HTTP_STATUS').length;
 return Object.freeze({
   company_id:'fenix',engine_id:'SEO-001',environment:'PUBLIC_READ_ONLY',
   schema_version:'1.0.0',checked:out.length,healthy:valid,http_errors:broken,
   redirects_to_review:redirects,unverified,
   status:valid===out.length?'PASS':'HOLD',
   proof:'PUBLIC_HTTP_HEAD_ONLY_NOT_GSC_URL_DIAGNOSIS',
   audited_urls:out,production_writes:0,customer_contacts:0,
   model_calls:0,staging_requests:0,new_subscription_eur:0
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await checkPublicNavigation();
 process.stdout.write(JSON.stringify(result)+'\n');
 if(result.status!=='PASS')process.exitCode=1;
}
