import crypto from 'node:crypto';
import {buildHciLearningEvents} from './hci001-interaction-runtime.mjs';
import {buildMotionLearningEvents} from './motion001-presence-runtime.mjs';

function hash(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')}

export function buildHumanExperienceLearningReport({hci_reports=[],motion_reports=[]}={}){
  if(!Array.isArray(hci_reports)||!Array.isArray(motion_reports))throw new Error('report arrays required');
  const hci=hci_reports.flatMap(r=>buildHciLearningEvents(r).events);
  const motion=motion_reports.flatMap(r=>buildMotionLearningEvents(r).events);
  const events=[...hci,...motion].sort((a,b)=>a.event_id.localeCompare(b.event_id));
  const ids=new Set();for(const e of events){if(ids.has(e.event_id))throw new Error(`duplicate event ${e.event_id}`);ids.add(e.event_id);if(!['HCI-001','MOTION-001'].includes(e.engine_id))throw new Error('unauthorized engine in human experience bridge');if(!['METRIC_OBSERVATION','ENGINE_EVENT'].includes(e.signal_family))throw new Error('unsupported learning signal family');if(e.environment!=='PREPROD'||e.prod_authorized!==false||e.prod_write_authorized!==false||e.trading_access!==false||e.additional_cost_eur!==0)throw new Error('authority expansion rejected');}
  const report={schema_version:'1.0.0',state_type:'CEREBRO_HUMAN_EXPERIENCE_LRN_EVENT_REPORT',environment:'PREPROD',producer_engines:['HCI-001','MOTION-001'],events_total:events.length,events,raw_content_persisted:false,sensitive_trait_inference:false,auto_promotion_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  report.report_sha256=hash(report);return Object.freeze(report);
}
