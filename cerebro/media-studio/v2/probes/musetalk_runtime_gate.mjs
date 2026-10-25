#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {evaluateMuseTalkPreprodCapability} from '../runtime/musetalk-capability-gate.mjs';

const result=evaluateMuseTalkPreprodCapability({company_id:'GLOBAL',environment:'PREPROD',request_id:'ums:musetalk:runtime-gate',license_verified:true,zero_cost_verified:true,preprod_install_requested:false});
const out=path.resolve(process.env.UMS_MUSETALK_REPORT??'ums-musetalk-runtime-gate.json');
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(result.status!=='HOLD_HARDWARE'&&result.status!=='MUSETALK_ELIGIBLE_FOR_PREPROD_PHYSICAL_BINDING')process.exit(2);
