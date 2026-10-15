#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ENDPOINT='https://www.juntadeandalucia.es/institutodeestadisticaycartografia/geoserver-ieca/espacios_productivos/ows';
const BASE={service:'WFS',version:'2.0.0',request:'GetFeature',typeName:'espacios_productivos:directorio_establecimientos',outputFormat:'application/json'};
const MAX_BYTES=5_000_000;

function sha(v){return crypto.createHash('sha256').update(v).digest('hex');}
function typeOf(v){if(v===null)return 'null';if(Array.isArray(v))return 'array';return typeof v;}
async function getJson(params){
  const url=`${ENDPOINT}?${new URLSearchParams({...BASE,...params}).toString()}`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25_000);
  let response;try{response=await fetch(url,{method:'GET',redirect:'error',headers:{accept:'application/json','user-agent':'CEREBRO-PREPROD-CAP-IECA-PROBE/0.2'},signal:controller.signal});}finally{clearTimeout(timer);}
  if(response.status!==200)throw new Error(`HTTP_${response.status}`);
  const ct=(response.headers.get('content-type')??'').toLowerCase();if(!ct.includes('json'))throw new Error(`CONTENT_TYPE_DENIED:${ct}`);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>MAX_BYTES)throw new Error('BODY_TOO_LARGE');
  const payload=JSON.parse(bytes.toString('utf8'));if(!payload||!Array.isArray(payload.features))throw new Error('FEATURE_COLLECTION_REQUIRED');
  return {response,ct,bytes,payload};
}

export async function probeIecaEspandV0(){
  const sample=await getJson({count:'10'});
  const rows=sample.payload.features.map(x=>x&&typeof x==='object'&&x.properties&&typeof x.properties==='object'?x.properties:{});
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))].sort();
  const schema=Object.fromEntries(keys.map(k=>{const vals=rows.map(r=>r[k]);return [k,{types:[...new Set(vals.map(typeOf))].sort(),null_count:vals.filter(v=>v===null||v===undefined).length,present_count:vals.filter(v=>v!==null&&v!==undefined).length}];}));

  const cordoba=await getJson({count:'5000',propertyName:'actividad,codmun,municipio',cql_filter:"codmun='14021'"});
  const activityCounts={};
  for(const feature of cordoba.payload.features){
    const p=feature?.properties??{};const activity=typeof p.actividad==='string'?p.actividad.trim():'';
    if(activity)activityCounts[activity]=(activityCounts[activity]??0)+1;
  }
  const activities=Object.entries(activityCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([activity,count])=>({activity,count}));

  return {
    schema_version:'1.1.0',state_type:'CEREBRO_CAP_IECA_ESPAND_PROBE_V0',company_id:'fenix',engine_id:'CAP-001',environment:'PREPROD',version:'v0',status:'OFFICIAL_PUBLIC_WFS_PROBE_GREEN',
    source:{publisher:'Instituto de Estadística y Cartografía de Andalucía',dataset:'ESPAND directorio_establecimientos',license:'CC-BY-4.0',method:'GET_ONLY',endpoint:ENDPOINT,http_status:sample.response.status,content_type:sample.ct,provider_writes:0},
    schema_probe:{feature_count:sample.payload.features.length,body_bytes:sample.bytes.length,body_sha256:sha(sample.bytes),property_keys:keys,property_schema:schema},
    cordoba_activity_probe:{codmun:'14021',feature_count:cordoba.payload.features.length,body_bytes:cordoba.bytes.length,body_sha256:sha(cordoba.bytes),activity_counts:activities},
    raw_company_names_persisted:false,raw_addresses_persisted:false,customer_data_used:false,personal_data_persisted:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,
    next_gate:'SELECT_REAL_ESTATE_ACTIVITY_VALUE_AND_BUILD_COMPANY_LEVEL_CORDOBA_SOURCE'
  };
}

const outArg=process.argv.indexOf('--out');
if(import.meta.url===new URL(`file://${process.argv[1]}`).href){
  probeIecaEspandV0().then(report=>{const text=JSON.stringify(report,null,2)+'\n';if(outArg>=0&&process.argv[outArg+1]){const p=path.resolve(process.argv[outArg+1]);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text,'utf8');}process.stdout.write(text);}).catch(err=>{process.stderr.write(JSON.stringify({status:'IECA_PROBE_RED',error:String(err?.message??err),prod_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');process.exitCode=1;});
}
