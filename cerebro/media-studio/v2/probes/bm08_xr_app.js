import {Engine,Scene,ArcRotateCamera,HemisphericLight,Vector3,SceneLoader} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

async function boot(){
  const canvas=document.getElementById('xr-canvas');
  const status=document.getElementById('status');
  const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,disableWebGL2Support:false});
  const scene=new Scene(engine);
  scene.clearColor.set(0.015,0.02,0.04,1);
  const camera=new ArcRotateCamera('camera',Math.PI*1.25,Math.PI*0.34,7.2,new Vector3(0,0,0),scene);
  camera.attachControl(canvas,true);
  new HemisphericLight('key',new Vector3(0.2,1,-0.3),scene).intensity=1.35;

  const manifest=await fetch('./xr-manifest.json').then(r=>{if(!r.ok)throw new Error(`manifest:${r.status}`);return r.json();});
  const xrSupport={api:Boolean(navigator.xr),immersive_ar:false,immersive_vr:false};
  if(navigator.xr){
    xrSupport.immersive_ar=await navigator.xr.isSessionSupported('immersive-ar').catch(()=>false);
    xrSupport.immersive_vr=await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false);
  }

  await SceneLoader.AppendAsync('./',manifest.asset.file,scene);
  const renderable=scene.meshes.filter(m=>m.getTotalVertices&&m.getTotalVertices()>0);
  if(renderable.length===0)throw new Error('XR_ASSET_NO_RENDERABLE_MESH');

  // Physical scale comes from glTF 2.0 meters. Placement transform is explicit and deterministic.
  for(const mesh of renderable){
    mesh.scaling.scaleInPlace(manifest.placement.scale);
    mesh.position.addInPlace(new Vector3(...manifest.placement.translation_m));
  }

  let xrBootstrap='HARDWARE_UNAVAILABLE_IN_CI';
  if(xrSupport.immersive_ar||xrSupport.immersive_vr){
    const sessionMode=xrSupport.immersive_ar?'immersive-ar':'immersive-vr';
    try{
      await scene.createDefaultXRExperienceAsync({
        uiOptions:{sessionMode,referenceSpaceType:'local-floor'},
        optionalFeatures:true,
        disableTeleportation:true
      });
      xrBootstrap=`READY:${sessionMode}`;
    }catch(err){xrBootstrap=`XR_BOOTSTRAP_FAILED:${String(err?.message||err).slice(0,120)}`;}
  }

  engine.runRenderLoop(()=>scene.render());
  window.addEventListener('resize',()=>engine.resize());
  scene.render();

  document.body.dataset.assetLoaded='true';
  document.body.dataset.meshCount=String(renderable.length);
  document.body.dataset.xrApi=String(xrSupport.api);
  document.body.dataset.immersiveAr=String(xrSupport.immersive_ar);
  document.body.dataset.immersiveVr=String(xrSupport.immersive_vr);
  document.body.dataset.xrBootstrap=xrBootstrap;
  document.body.dataset.unit='meter';
  document.body.dataset.sourceSha256=manifest.asset.sha256;
  status.textContent=`BM-08 XR package · asset loaded · ${renderable.length} meshes · XR ${xrBootstrap}`;
  window.__CEREBRO_BM08__={manifest,xrSupport,xrBootstrap,meshCount:renderable.length,assetLoaded:true};
}

boot().catch(err=>{
  document.body.dataset.assetLoaded='false';
  document.body.dataset.bootError=String(err?.message||err).slice(0,180);
  const status=document.getElementById('status');
  if(status) status.textContent=`BM-08 XR boot failed · ${document.body.dataset.bootError}`;
  console.error(err);
});
