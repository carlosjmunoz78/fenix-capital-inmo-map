import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const defaultSnapshot=path.resolve(here,'verified-source-snapshot-2026-10-25.json');

export function loadVerifiedSourceSnapshot(file=defaultSnapshot){return JSON.parse(fs.readFileSync(file,'utf8'));}

export function evaluateSourceFreshness(snapshot=loadVerifiedSourceSnapshot(),{now=new Date(),maxAgeDays=7}={}){
  const observed=new Date(`${snapshot.snapshot_date}T00:00:00Z`);
  const ageDays=Math.floor((now-observed)/(24*60*60*1000));
  const stale=ageDays>maxAgeDays;
  return {snapshot_date:snapshot.snapshot_date,age_days:ageDays,stale,max_age_days:maxAgeDays,source_count:snapshot.sources.length,action:stale?'REFRESH_REQUIRED':'CURRENT_WITHIN_POLICY'};
}

export function buildSourceRefreshJobs(snapshot=loadVerifiedSourceSnapshot()){
  return snapshot.sources.map(s=>({job_type:'VERIFY_PROFESSIONAL_SOURCE_VERSION',source_id:s.source_id,uri:s.uri,departments:s.departments,previous_observed_version:s.observed_version,priority:s.topic==='content_credentials_provenance'||s.topic==='professional_hdr_image_storage'?'HIGH':'NORMAL'}));
}
