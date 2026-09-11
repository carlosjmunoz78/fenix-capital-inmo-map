#!/usr/bin/env python3
import argparse, datetime as dt, json, os, pathlib, shlex, subprocess, sys, tarfile

PROJECTS=[
    'fenix-trading-lab',
    'fenix-capital-455809',
    'fenix-inmobiliaria',
    'fenix-capital-make-web-y-seo',
]
COMMANDS={
    'projects': ['gcloud projects describe {project} --format=json'],
    'enabled_apis': ['gcloud services list --enabled --project={project} --format=json'],
    'cloud_run': ['gcloud run services list --project={project} --platform=managed --format=json'],
    'cloud_functions': ['gcloud functions list --project={project} --format=json'],
    'compute': ['gcloud compute instances list --project={project} --format=json'],
    'jobs': ['gcloud run jobs list --project={project} --format=json'],
    'pubsub': [
        'gcloud pubsub topics list --project={project} --format=json',
        'gcloud pubsub subscriptions list --project={project} --format=json',
    ],
    'storage': ['gcloud storage buckets list --project={project} --format=json'],
    'databases': [
        'gcloud sql instances list --project={project} --format=json',
        'gcloud firestore databases list --project={project} --format=json',
    ],
    'artifact_registry': ['gcloud artifacts repositories list --project={project} --format=json'],
    'service_accounts_and_iam': [
        'gcloud iam service-accounts list --project={project} --format=json',
        'gcloud projects get-iam-policy {project} --format=json',
    ],
    'secret_references': ['gcloud secrets list --project={project} --format=json'],
    'networking': [
        'gcloud compute networks list --project={project} --format=json',
        'gcloud compute firewall-rules list --project={project} --format=json',
    ],
    'logging_monitoring': [
        'gcloud logging sinks list --project={project} --format=json',
        'gcloud monitoring policies list --project={project} --format=json',
    ],
    'billing_cost': ['gcloud billing projects describe {project} --format=json'],
    'regions': ['gcloud compute regions list --project={project} --format=json'],
    'deployments': ['gcloud deployment-manager deployments list --project={project} --format=json'],
    'resource_consumers': ['gcloud asset search-all-resources --scope=projects/{project} --format=json'],
}

FORBIDDEN=(' create ',' update ',' delete ',' deploy ',' set ',' add-iam-policy-binding ',' remove-iam-policy-binding ',' enable ',' disable ',' start ',' stop ',' restart ',' patch ',' write ')


def run(cmd):
    padded=' '+cmd+' '
    if any(token in padded for token in FORBIDDEN):
        raise RuntimeError(f'forbidden mutating verb in command: {cmd}')
    proc=subprocess.run(shlex.split(cmd), text=True, capture_output=True)
    stdout=proc.stdout.strip(); stderr=proc.stderr.strip()
    if proc.returncode==0:
        try: data=json.loads(stdout or '[]')
        except json.JSONDecodeError: data=stdout
        status='EMPTY' if data in ([],{},'') else 'SUCCESS'
    else:
        low=stderr.lower()
        if 'permission' in low or 'forbidden' in low or 'not have permission' in low:
            status='PERMISSION_DENIED'
        elif 'api' in low and ('disabled' in low or 'not enabled' in low or 'has not been used' in low):
            status='API_UNAVAILABLE'
        else:
            status='ERROR'
        data=None
    return {'command':cmd,'returncode':proc.returncode,'status':status,'stdout':data,'stderr':stderr[:12000]}


def scheduler(project):
    discover=f'gcloud scheduler locations list --project={project} --format=json'
    d=run(discover)
    results=[d]
    if d['status']=='SUCCESS' and isinstance(d['stdout'],list):
        locations=[]
        for item in d['stdout']:
            name=item.get('name') if isinstance(item,dict) else None
            if isinstance(name,str):
                if name.startswith('locations/') and name.count('/')==1:
                    locations.append(name.split('/',1)[1])
                elif name.startswith(f'projects/{project}/locations/') and name.count('/')==3:
                    locations.append(name.rsplit('/',1)[1])
        for loc in sorted(set(locations)):
            results.append(run(f'gcloud scheduler jobs list --project={project} --location={loc} --format=json'))
    return results


def main():
    ap=argparse.ArgumentParser(description='CEREBRO GCP read-only inventory collector V0')
    ap.add_argument('--execute-read-only', action='store_true', help='required safety acknowledgement')
    args=ap.parse_args()
    if not args.execute_read_only:
        print('Refusing to execute without --execute-read-only', file=sys.stderr); return 2
    if subprocess.run(['bash','-lc','command -v gcloud >/dev/null 2>&1']).returncode!=0:
        print('gcloud not found', file=sys.stderr); return 3
    account=subprocess.run(['gcloud','auth','list','--filter=status:ACTIVE','--format=value(account)'],text=True,capture_output=True).stdout.strip()
    if not account:
        print('No active gcloud account', file=sys.stderr); return 4
    stamp=dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    root=pathlib.Path.home()/f'cerebro-gcp-readonly-{stamp}'
    root.mkdir(parents=True,exist_ok=False)
    summary={'schema_version':'0.1.0','mode':'READ_ONLY_CAPTURE_ONLY','captured_at':stamp,'active_account':account,'projects':{},'trading_mutation_forbidden':True,'secret_payload_accessed':False}
    for project in PROJECTS:
        pdata={}
        for domain,cmds in COMMANDS.items():
            pdata[domain]=[run(c.format(project=project)) for c in cmds]
        pdata['scheduler']=scheduler(project)
        summary['projects'][project]=pdata
        (root/f'{project}.json').write_text(json.dumps(pdata,ensure_ascii=False,indent=2),encoding='utf-8')
    (root/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    archive=pathlib.Path.home()/f'{root.name}.tar.gz'
    with tarfile.open(archive,'w:gz') as tf: tf.add(root,arcname=root.name)
    print(str(archive))
    return 0

if __name__=='__main__':
    raise SystemExit(main())
