import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const FAMILIES=Object.freeze({
  FFMPEG:[/\bffmpeg\b/i,/\bffprobe\b/i,/fluent-ffmpeg/i,/@ffmpeg\//i],
  BLENDER:[/\bblender\b/i],
  SOX:[/\bsox\b/i,/sox-audio/i],
  IMAGEMAGICK:[/\bimagemagick\b/i,/\bmagick\s/i],
  REMOTION:[/\bremotion\b/i,/@remotion\//i],
  HYPERFRAMES:[/\bhyperframes\b/i]
});
const TEXT_EXT=/\.(?:js|mjs|cjs|ts|tsx|jsx|json|ya?ml|md|txt|sh|ps1|py|toml|ini|conf|env|dockerfile)$/i;
const EXCLUDED_PREFIXES=['cerebro/media-studio/v2/','.github/workflows/cerebro-ums-','.git/','node_modules/','dist/','build/'];
function excluded(path){return EXCLUDED_PREFIXES.some((prefix)=>path.startsWith(prefix))||path.includes('/node_modules/');}
function classifyLine(line,patterns){return patterns.some((pattern)=>pattern.test(line));}

export function inventoryMediaRuntimeReferences(entries=[]){
  const findings=[];
  for(const entry of entries){
    if(!entry||excluded(entry.path??''))continue;
    const content=String(entry.content??'');
    const lines=content.split(/\r?\n/);
    for(const [family,patterns] of Object.entries(FAMILIES)){
      const hits=[];
      for(let i=0;i<lines.length;i++)if(classifyLine(lines[i],patterns))hits.push({line:i+1,snippet:lines[i].trim().slice(0,300)});
      if(hits.length)findings.push({family,path:entry.path,hits:hits.slice(0,20)});
    }
  }
  const families=Object.keys(FAMILIES).map((family)=>{
    const refs=findings.filter((x)=>x.family===family);
    return Object.freeze({family,status:refs.length?'REFERENCES_FOUND_REVIEW_REQUIRED':'NO_TRACKED_REFERENCE_FOUND',reference_count:refs.reduce((n,x)=>n+x.hits.length,0),paths:Object.freeze([...new Set(refs.map((x)=>x.path))].sort()),operational_claim:false});
  });
  return Object.freeze({
    schema_version:'1.1.0',state_type:'CEREBRO_UMS_REPOSITORY_MEDIA_RUNTIME_INVENTORY_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'1.1.0',
    scanned_entries:entries.filter((x)=>!excluded(x?.path??'')).length,excluded_ums_namespace:true,excluded_ums_workflows:true,families:Object.freeze(families),findings:Object.freeze(findings),
    interpretation:'A tracked text reference is discovery evidence only. It does not prove an installed, executable, licensed, secure or production-ready runtime.',
    prod_binding_authorized:false,installation_authorized:false,spend_authorized:false,additional_cost_eur:0
  });
}

function loadTrackedEntries(){
  const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
  const entries=[];
  for(const path of files){
    if(excluded(path))continue;
    const name=path.split('/').pop()??'';
    if(!TEXT_EXT.test(path)&&!/^Dockerfile(?:\.|$)/i.test(name))continue;
    try{const stat=fs.statSync(path);if(!stat.isFile()||stat.size>512_000)continue;entries.push({path,content:fs.readFileSync(path,'utf8')});}catch{}
  }
  return entries;
}

if(process.argv[1]&&process.argv[1].endsWith('repository-media-runtime-inventory.mjs')){
  const report=inventoryMediaRuntimeReferences(loadTrackedEntries());
  const outIndex=process.argv.indexOf('--out');const out=outIndex>=0?process.argv[outIndex+1]:null;
  const body=`${JSON.stringify(report,null,2)}\n`;if(out)fs.writeFileSync(out,body);else process.stdout.write(body);
}
