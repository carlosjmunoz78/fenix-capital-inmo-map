// FACT-001 / Notion LAB: batch 3 independent service permission probe.
// Fixed human-approved targets that were previously opened in Opera.
// No page content, mutable database IDs, secrets, or write operations.
export const NOTION_BATCH3_ROOTS=Object.freeze([
 ['ZIP Wiki Redes','38281b1a-756d-81b4-9703-d5ed43bed81a','page'],
 ['ZIP Comandos IA','37d81b1a-756d-81ee-92d6-e15f41dbec95','page'],
 ['Import logs abril 2025','1c881b1a-756d-8153-bc0f-e9ce1a3f1f4d','page'],
 ['Plantilla inmobiliarias Cordoba','1c881b1a-756d-80d4-acd6-fe1731d4be0d','page'],
 ['Import logs marzo 28','1c481b1a-756d-8120-891b-f3347e2deb37','page'],
 ['Import logs marzo 27 A','1c381b1a-756d-8158-9fd1-c6a471133a32','page'],
 ['Import logs marzo 27 B','1c381b1a-756d-8198-a298-e9148d52638a','page'],
 ['Import logs marzo 27 C','1c381b1a-756d-816b-92e5-d5457854a4e6','page'],
 ['Import logs marzo 27 D','1c381b1a-756d-8188-b723-f98fb4e9eda4','page'],
 ['Import logs marzo 27 E','1c381b1a-756d-81d4-9d74-c53b347e83ba','page'],
 ['Import logs marzo 27 F','1c381b1a-756d-81e1-b442-c400613a6014','page'],
 ['Import logs marzo 27 G','1c381b1a-756d-81f3-9ac6-ec7ac66d4b1b','page'],
 ['Import logs marzo 27 H','1c381b1a-756d-8114-8f16-ec9b3ea72543','page'],
 ['Import logs marzo 27 I','1c381b1a-756d-810e-89fd-cedba08d3a65','page'],
 ['Import CRM completo 2025','1c381b1a-756d-8094-aafa-f63bb90d6a50','page'],
 ['Import logs marzo 27 J','1c381b1a-756d-8182-84d6-f318e335fd86','page'],
 ['Primeros pasos','1c381b1a-756d-8020-9eeb-e0df3159bdda','page'],
 ['Pagina historica','38981b1a-756d-8079-9b44-ee66b1de9935','page'],
 ['TEST V17.1','3ba81b1a-756d-81ce-8e23-d6babac19b3e','page'],
].map(([name,id,type])=>Object.freeze({name,id,type})));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function probeNotionThirdBatch({token,http=fetch}={}){
 if(NOTION_BATCH3_ROOTS.length!==19||new Set(NOTION_BATCH3_ROOTS.map(x=>x.id)).size!==12||
   NOTION_BATCH3_ROOTS.some(x=>!UUID.test(x.id)||!['page','database'].includes(x.type)))
  throw Error('NOTION_BATCH3_ALLOWLIST_DENIED');
 if(typeof token!=='string'||token.length<24||token.length>8192||/\s/.test(token))throw Error('NOTION_SERVICE_TOKEN_DENIED');
 const items=[];
 for(const {name,id,type} of NOTION_BATCH3_ROOTS){
  if(http===fetch&&items.length)await new Promise(resolve=>setTimeout(resolve,380));
  const url='https://api.notion.com/v1/'+(type==='database'?'databases/':'pages/')+id;
  let res;
  try{res=await http(url,{method:'GET',headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json'},
   redirect:'error',signal:AbortSignal.timeout(9000)});}
  catch{items.push({name,id,type,status:'NETWORK_UNVERIFIED'});continue;}
  if(res.status===200){items.push({name,id,type,status:'ACCESS_VERIFIED'});continue;}
  if(res.status===404){items.push({name,id,type,status:'NOT_ACCESSIBLE'});continue;}
  if(res.status===401||res.status===403)throw Error('NOTION_SERVICE_AUTH_DENIED_'+res.status);
  items.push({name,id,type,status:'UNVERIFIED_HTTP_'+res.status});
 }
 return {status:'FACT001_NOTION_BATCH3_INDEPENDENT_READ',scope:{company_id:'fenix-capital',
  engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},checked:items.length,
  accessible:items.filter(x=>x.status==='ACCESS_VERIFIED').length,
  denied:items.filter(x=>x.status==='NOT_ACCESSIBLE').length,
  inconclusive:items.filter(x=>!['ACCESS_VERIFIED','NOT_ACCESSIBLE'].includes(x.status)).length,
  results:items,content_returned:false,write_operations:0,credential_exposed:false};
}
