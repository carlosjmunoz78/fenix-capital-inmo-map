import { createCloudBrowserWorker } from './cloud-browser-worker-v0.mjs';
import { evaluateBrowserSessionBinding } from './browser-session-binding-v1.mjs';

function targetUrlFromJob(job = {}) {
  if (job.session_target_url) return job.session_target_url;
  const nav = (job.actions || []).find(action => action?.type === 'NAVIGATE' && action.url);
  return nav?.url || null;
}

function requiresSession(job = {}) {
  return job.operation?.kind === 'AUTHENTICATED_OBSERVE' || job.operation?.authenticated_session_required === true;
}

export function prepareGovernedBrowserJob(job = {}, now = Date.now()) {
  if (!requiresSession(job)) {
    return Object.freeze({ok:true,job,session_binding:null});
  }

  if (!job.session_bundle) {
    return Object.freeze({
      ok:false,
      job:null,
      session_binding:Object.freeze({status:'HOLD_SESSION_BUNDLE_REQUIRED',session_binding_authorized:false})
    });
  }

  const browserProfileId = job.browser_profile_id || `${job.company_id}-${job.identity_id}-${job.environment}`;
  const sessionBinding = evaluateBrowserSessionBinding({
    bundle:job.session_bundle,
    request:{
      company_id:job.company_id,
      identity_id:job.identity_id,
      environment:job.environment,
      browser_profile_id:browserProfileId,
      target_url:targetUrlFromJob(job)
    },
    now,
    max_ttl_ms:job.session_max_ttl_ms
  });

  if (sessionBinding.status !== 'AUTHORIZED') {
    return Object.freeze({ok:false,job:null,session_binding:sessionBinding});
  }

  const prepared = {
    ...job,
    browser_profile_id:browserProfileId,
    engine_authority:{
      ...(job.engine_authority || {}),
      session_binding_authorized:true
    }
  };
  delete prepared.session_bundle;

  return Object.freeze({ok:true,job:Object.freeze(prepared),session_binding:sessionBinding});
}

export function createGovernedCloudBrowserWorker(options = {}) {
  const worker = createCloudBrowserWorker(options);
  return Object.freeze({
    ...worker,
    async execute(job = {}) {
      const prepared = prepareGovernedBrowserJob(job);
      if (!prepared.ok) {
        return {
          ok:false,
          authorization:Object.freeze({
            status:prepared.session_binding.status,
            session_binding_authorized:false,
            action_execution_authorized:false
          }),
          session_binding:prepared.session_binding,
          results:[]
        };
      }
      const result = await worker.execute(prepared.job);
      return {...result,session_binding:prepared.session_binding};
    }
  });
}
