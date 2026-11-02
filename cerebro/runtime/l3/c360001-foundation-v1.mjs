import {foundationContext,foundationManifest} from './foundation-context-v1.mjs';

export const manifest=foundationManifest({
  engine_id:'C360-001',
  name:'Cliente 360 · Foundation Wrapper',
  wrapped_existing_paths:['cerebro/customer/c360-native-v1.mjs','cerebro/runtime/lote3-com-notif-c360-real-v1.mjs']
});

const FIELDS=['identity','contact','relationship','journey','service','communication','consent'];
export function buildCustomer360Snapshot(input={}){
  const context=foundationContext(manifest.engine_id,input);
  const facets=input.facets&&typeof input.facets==='object'?input.facets:{};
  const snapshot={};let present=0;
  for(const key of FIELDS){const value=facets[key]??null;snapshot[key]=value;if(value!==null&&value!==''&&!(Array.isArray(value)&&value.length===0))present++;}
  const completeness=Math.round((present/FIELDS.length)*100);
  return {status:'FOUNDATION_OK',context,snapshot,completeness_pct:completeness,missing:FIELDS.filter(k=>snapshot[k]===null||snapshot[k]===''||(Array.isArray(snapshot[k])&&snapshot[k].length===0)),source_mode:'INPUT_ONLY_NO_EXTERNAL_LOOKUP',prod_write:false,cost_eur:0};
}
