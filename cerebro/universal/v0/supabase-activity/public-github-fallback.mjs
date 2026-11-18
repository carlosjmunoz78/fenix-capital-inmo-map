/** Public metadata fallback for an expired GitHub Actions snapshot.
 * Only real GitHub workflow IDs and canonical run URLs. Does NOT establish
 * agent/role instance identity or physical status outside the observed page.
 */
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const ACTIVE=new Set(['queued','waiting','requested','pending']);
export function selectPublicGithubRuns(rows) {
  if(!Array.isArray(rows)) throw new Error('GITHUB_PUBLIC_RUNS_SCHEMA_INVALID');
  const seen=new Set(), valid=[];
  for(const r of rows) {
    if(!Number.isSafeInteger(r?.id)||r.id<=0||seen.has(r.id))continue;
    if(typeof r.name!=='string'||typeof r.path!=='string')continue;
    const label=(r.name+' '+r.path).toUpperCase();
    if(!label.includes('CEREBRO')&&!label.includes('PROD LIVE DEPLOY')&&!label.includes('ENGINE FACTORY'))continue;
    if(r.html_url!=='https://github.com/'+REPO+'/actions/runs/'+r.id)continue;
    if(!Number.isFinite(Date.parse(r.updated_at??'')))continue;
    if(r.status!=='in_progress'&&!ACTIVE.has(r.status)&&r.status!=='completed')continue;
    seen.add(r.id);valid.push(r);
  }
  const running=valid.filter(r=>r.status==='in_progress');
  const queued=valid.filter(r=>ACTIVE.has(r.status));
  const history=valid.filter(r=>r.status==='completed');
  return {selected:[...running,...queued,...history].slice(0,24),
    running_observed:running.length,queued_observed:queued.length};
}
