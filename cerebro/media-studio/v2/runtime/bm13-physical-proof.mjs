import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probePremiumPhysicalRenderer, renderPremiumPhysicalVideo } from './premium-physical-renderer-v2.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
const orderPath=process.env.CEREBRO_UMS_BM13_ORDER||path.join(root,'cerebro/media-studio/v2/orders/bm13-fenix-premium-trial-v2.json');
const exportDir=process.env.CEREBRO_UMS_EXPORT_DIR||path.join(root,'dist/ums-bm13-physical-v2');
const blenderBin=process.env.BLENDER_BIN||'blender';

try {
  const order=JSON.parse(await fs.readFile(orderPath,'utf8'));
  const probe=await probePremiumPhysicalRenderer({blender_bin:blenderBin});
  if(probe.status!=='PASS'){
    console.error(JSON.stringify({ok:false,status:'WAITING_FOR_CAPABILITY',probe},null,2));
    process.exit(2);
  }
  const rendered=await renderPremiumPhysicalVideo(order,{blender_bin:blenderBin,export_dir:exportDir});
  const summary={
    ok:true,
    status:'PHYSICAL_DELIVERABLE_TECHNICALLY_VALID',
    bm13_status:'NOT_PASSED_PENDING_INDEPENDENT_CREATIVE_TRIBUNAL',
    export_dir:exportDir,
    additional_cost_eur:0,
    publish_authorized:false,
    technical:rendered.technical,
    artifacts:rendered.artifacts.map(a=>({filename:a.filename,mime:a.mime,bytes:a.bytes,sha256:a.sha256,width:a.width??null,height:a.height??null,duration_sec:a.duration_sec??null}))
  };
  await fs.mkdir(exportDir,{recursive:true});
  await fs.writeFile(path.join(exportDir,'RUN_SUMMARY.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary));
} catch (error) {
  const detail={
    ok:false,
    status:'PHYSICAL_RENDER_FAILED',
    error:String(error?.message||error),
    command_exit_code:error?.result?.code??null,
    stdout:String(error?.result?.stdout||'').slice(-12000),
    stderr:String(error?.result?.stderr||'').slice(-12000),
  };
  console.error(JSON.stringify(detail,null,2));
  process.exit(1);
}
