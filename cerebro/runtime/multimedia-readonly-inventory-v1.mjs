import {spawnSync} from 'node:child_process';

export const MULTIMEDIA_TARGETS=Object.freeze([
  Object.freeze({id:'ffmpeg',commands:[Object.freeze({bin:'ffmpeg',args:['-version']})]}),
  Object.freeze({id:'ffprobe',commands:[Object.freeze({bin:'ffprobe',args:['-version']})]}),
  Object.freeze({id:'imagemagick',commands:[Object.freeze({bin:'magick',args:['-version']}),Object.freeze({bin:'convert',args:['-version']})]}),
  Object.freeze({id:'sox',commands:[Object.freeze({bin:'sox',args:['--version']})]}),
  Object.freeze({id:'espeak-ng',commands:[Object.freeze({bin:'espeak-ng',args:['--version']})]})
]);

const firstLine=value=>String(value??'').split(/\r?\n/).map(x=>x.trim()).find(Boolean)??null;
function defaultRunner(bin,args){
  const result=spawnSync(bin,args,{encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:64*1024,env:process.env});
  return {status:result.status,error:result.error??null,stdout:result.stdout??'',stderr:result.stderr??''};
}
function observeTarget(target,runner){
  for(const command of target.commands){
    const r=runner(command.bin,command.args);
    if(!r.error&&r.status===0){
      return Object.freeze({id:target.id,present:true,command:command.bin,version_line:firstLine(r.stdout)||firstLine(r.stderr),probe_status:'PRESENT'});
    }
    if(r.error?.code&&r.error.code!=='ENOENT'){
      return Object.freeze({id:target.id,present:false,command:command.bin,version_line:null,probe_status:'PROBE_ERROR',error_code:String(r.error.code)});
    }
  }
  return Object.freeze({id:target.id,present:false,command:null,version_line:null,probe_status:'ABSENT'});
}

export function buildMultimediaReadonlyInventory({runner=defaultRunner,platform=process.platform,now=new Date().toISOString()}={}){
  const tools=MULTIMEDIA_TARGETS.map(target=>observeTarget(target,runner));
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_MULTIMEDIA_READONLY_INVENTORY_V1',environment:'PREPROD',
    platform,observed_at:now,status:'READ_ONLY_INVENTORY_COMPLETE',tools:Object.freeze(tools),
    present_count:tools.filter(x=>x.present).length,missing_count:tools.filter(x=>!x.present).length,
    mutations_performed:0,downloads_performed:0,installs_performed:0,network_required:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

if(process.argv[1]&&new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll('\\','/').split('/').pop())){
  process.stdout.write(`${JSON.stringify(buildMultimediaReadonlyInventory(),null,2)}\n`);
}
