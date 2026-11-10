// FACT-001 / Notion LAB: batch 2 independent service permission probe.
// Fixed human-approved targets that were previously opened in Opera.
// No page content, mutable database IDs, secrets, or write operations.
export const NOTION_BATCH2_ROOTS=Object.freeze([
 ['Plantilla_Tarea_Notion','1c981b1a-756d-80b3-94aa-c153ab15b2a6','page'],
 ['INMOBILIARIAS CORDOBA base 1','1c881b1a-756d-80fc-a205-db47afbc1e5a','database'],
 ['INMOBILIARIAS CORDOBA base 2','1c881b1a-756d-80cf-9c4b-d0c1d7a40ff4','database'],
 ['inmobiliarias_cordoba_capital','1c881b1a-756d-80fc-b86c-fe3b7a02e033','database'],
 ['Tareas','1c381b1a-756d-8051-93f3-e31c8f9f0909','page'],
 ['Rol como arquitecto operativo Notion','39181b1a-756d-80ba-b948-e391d6d2b95f','page'],
 ['Patron ficha 360 Oferta bancaria','3ba81b1a-756d-811a-a0f0-c73d1d044650','page'],
 ['Patron ficha 360 Tasacion','3ba81b1a-756d-8179-93a7-d119c660339e','page'],
 ['Patron ficha 360 FEIN y firma','3ba81b1a-756d-8170-bd63-d9d7b59d5a8b','page'],
 ['Ajuste UX menor TIKTOK ADS','39181b1a-756d-80a5-9bf5-d9f1deb2b580','page'],
 ['Muestra Redes Fenix julio 2026','38981b1a-756d-8008-95e1-d1d80c2f7623','database'],
 ['TEST Imagen Notion AI','4ac08402-1b47-42d3-b72f-c017bcf27f7c','page']
].map(([name,id,type])=>Object.freeze({name,id,type})));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function probeNotionSecondBatch({token,http=fetch}={}){
 if(NOTION_BATCH2_ROOTS.length!==12||new Set(NOTION_BATCH2_ROOTS.map(x=>x.id)).size!==12||
   NOTION_BATCH2_ROOTS.some(x=>!UUID.test(x.id)||!['page','database'].includes(x.type)))
  throw Error('NOTION_BATCH2_ALLOWLIST_DENIED');
 if(typeof token!=='string'||token.length<24||token.length>8192||/\s/.test(token))throw Error('NOTION_SERVICE_TOKEN_DENIED');
 const items=[];
 for(const {name,id,type} of NOTION_BATCH2_ROOTS){
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
 return {status:'FACT001_NOTION_BATCH2_INDEPENDENT_READ',scope:{company_id:'fenix-capital',
  engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},checked:items.length,
  accessible:items.filter(x=>x.status==='ACCESS_VERIFIED').length,
  denied:items.filter(x=>x.status==='NOT_ACCESSIBLE').length,
  inconclusive:items.filter(x=>!['ACCESS_VERIFIED','NOT_ACCESSIBLE'].includes(x.status)).length,
  results:items,content_returned:false,write_operations:0,credential_exposed:false};
}
