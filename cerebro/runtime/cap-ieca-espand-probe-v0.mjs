#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ENDPOINT='https://www.juntadeandalucia.es/institutodeestadisticaycartografia/geoserver-ieca/espacios_productivos/ows';
const PARAMS=new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeName:'espacios_productivos:directorio_establecimientos',outputFormat:'application/json',count:'10'});
const URL_FIXED=`${ENDPOINT}?${PARAMS.toString()}`;
const MAX_BYTES=1_000_000;

function sha(v){return crypto.createHash('sha256').update(v).digest('hex');}
function typeOf(v){if(v===null)return 'null';if(Array.isArray(v))return 'array';return typeof v;}

export async function probeIecaEspandV0(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20_000);
  let response;
  try{
    response=await fetch(URL_FIXED,{method:'GET',redirect:'error',headers:{accept:'application/json','user-agent':'CEREBRO-PREPROD-CAP-IECA-PROBE/0.1'},signal:controller.signal});
  } finally { clearTimeout(timer); }
  if(response.status!==200)throw new Error(`HTTP_${response.status}`);
  const ct=(response.headers.get('content-type')??'').toLowerCase();
  if(!ct.includes('json'))throw new Error(`CONTENT_TYPE_DENIED:${ct}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>MAX_BYTES)throw new Error('BODY_TOO_LARGE');
  const payload=JSON.parse(bytes.toString('utf8'));
  if(!payload||!Array.isArray(payload.features))throw new Error('FEATURE_COLLECTION_REQUIRED');
  const rows=payload.features.map(x=>x&&typeof x==='object'&&x.properties&&typeof x.properties==='object'?x.properties:{});
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))].sort();
  const schema=Object.fromEntries(keys.map(k=>{
    const vals=rows.map(r=>r[k]);
    return [k,{types:[...new Set(vals.map(typeOf))].sort(),null_count:vals.filter(v=>v===null||v===undefined).length,present_count:vals.filter(v=>v!==null&&v!==undefined).length}];
  }));
  return {
    schema_version:'1.0.0',state_type:'CEREBRO_CAP_IECA_ESPAND_PROBE_V0',company_id:'fenix',engine_id:'CAP-001',environment:'PREPROD',version:'v0',status:'OFFICIAL_PUBLIC_WFS_PROBE_GREEN',
    source:{publisher:'Instituto de Estadística y Cartografía de Andalucía',dataset:'ESPAND directorio_establecimientos',license:'CC-BY-4.0',method:'GET_ONLY',endpoint:ENDPOINT,http_status:response.status,content_type:ct,body_bytes:bytes.length,body_sha256:sha(bytes),provider_writes:0},
    feature_count:payload.features.length,property_keys:keys,property_schema:schema,
    raw_feature_values_persisted:false,customer_data_used:false,personal_data_persisted:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,
    next_gate:'MAP_PUBLIC_BUSINESS_FIELDS_AND_BUILD_CORDOBA_REAL_ESTATE_FILTER'
  };
}

const outArg=process.argv.indexOf('--out');
if(import.meta.url===new URL(`file://${process.argv[1]}`).href){
  probeIecaEspandV0().then(report=>{
    const text=JSON.stringify(report,null,2)+'\n';
    if(outArg>=0&&process.argv[outArg+1]){const p=path.resolve(process.argv[outArg+1]);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text,'utf8');}
    process.stdout.write(text);
  }).catch(err=>{process.stderr.write(JSON.stringify({status:'IECA_PROBE_RED',error:String(err?.message??err),prod_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');process.exitCode=1;});
}
