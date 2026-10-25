import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const PRODUCTORA_FACEBOOK_SARFIX_VERSION='2.8.1';

async function loadPatchedProductora(){
  const sourcePath=fileURLToPath(new URL('./creative-facebook-productora-v28.mjs',import.meta.url));
  let source=await fs.readFile(sourcePath,'utf8');
  const needle='crop=${w}:${h},fps=30';
  const matches=source.split(needle).length-1;
  if(matches!==1)throw new Error(`SAR_PATCH_CONTRACT_MISMATCH:${matches}`);
  source=source.replace(needle,'crop=${w}:${h},setsar=1,fps=30');
  source=source.replace("export const PRODUCTORA_FACEBOOK_VERSION='2.8.0';","export const PRODUCTORA_FACEBOOK_VERSION='2.8.1-SARFIX';");
  const temp=`/tmp/cerebro-productora-facebook-v281-${process.pid}.mjs`;
  await fs.writeFile(temp,source,'utf8');
  return import(`${pathToFileURL(temp).href}?v=${Date.now()}`);
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [briefFile,audioDir,assetDir,musicDir,outDir]=process.argv.slice(2);
  if(!outDir)throw new Error('USAGE: node creative-facebook-productora-v28-sarfix.mjs <brief> <audioDir> <assetDir> <musicDir> <outDir>');
  const mod=await loadPatchedProductora();
  const manifest=await mod.buildFacebookProductoraV28({briefFile,audioDir,assetDir,musicDir,outDir});
  console.log(JSON.stringify({ok:true,wrapper_version:PRODUCTORA_FACEBOOK_SARFIX_VERSION,productora_version:mod.PRODUCTORA_FACEBOOK_VERSION,productions:manifest.productions.map(p=>({campaign:p.campaign_id,format:p.format,duration:p.duration_sec,voice:p.voice.id,visual:p.visual_profile.id,artifact:p.artifact})),diversity:manifest.diversity,gates:manifest.gates}));
}
