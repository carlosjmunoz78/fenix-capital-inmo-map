import { createCloudBrowserWorker } from './cloud-browser-worker-v0.mjs';
import { evaluateBrowserSessionBinding } from './browser-session-binding-v1.mjs';
import { evaluateBrowserExecution } from './browser-transversal-autonomy-v1.mjs';

function originOf(value) {
  try { return new URL(String(value)).origin; }
  catch { return null; }
}

function targetUrlFromJob(job = {}) {
  if (job.session_target_url) return job.session_target_url;
  const nav = (job.actions || []).find(action => action?.type === 'NAVIGATE' && action.url);
  return nav?.url || null;
}

function requiresSession(job = {}) {
  return job.operation?.kind === 'AUTHENTICATED_OBSERVE' || job.operation?.authenticated_session_required === true;
}

function explicitActionOriginsAllowed(job = {}, bundle = {}) {
  const allowed = new Set((bundle.allowed_origins || []).map(originOf).filter(Boolean));
  for (const action of (job.actions || [])) {
    if ((action?.type === 'NAVIGATE' || action?.type === 'OPEN_TAB') && action.url) {
      const origin = originOf(action.url);
      if (!origin || !allowed.has(origin)) return false;
    }
  }
  return true;
}

function authorizePreparedJob(job = {}) {
  return evaluateBrowserExecution({
    engine_id:job.engine_id,
    environment:job.environment,
    canonical_engine_ids:job.canonical_engine_ids || [],
    route_needed:job.route_needed !== false,
    browser_binding:job.browser_binding || {},
    operation:job.operation || {},
    engine_authority:job.engine_authority || {}
  });
}

function failure(status, sessionBinding = null, humanRequired = null) {
  return {
    ok:false,
    authorization:Object.freeze({
      status,
      session_binding_authorized:sessionBinding?.session_binding_authorized === true,
      action_execution_authorized:false,
      human_required:humanRequired
    }),
    session_binding:sessionBinding,
    results:[]
  };
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
  if (!explicitActionOriginsAllowed(job, job.session_bundle)) {
    return Object.freeze({
      ok:false,
      job:null,
      session_binding:Object.freeze({...sessionBinding,status:'HOLD_SESSION_ORIGIN_DENIED',session_binding_authorized:false})
    });
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

export function createGovernedCloudBrowserWorker({secret_resolver = null, ...workerOptions} = {}) {
  const worker = createCloudBrowserWorker(workerOptions);
  return Object.freeze({
    ...worker,
    async execute(job = {}) {
      const originalBundle = job.session_bundle || null;
      const prepared = prepareGovernedBrowserJob(job);
      if (!prepared.ok) {
        return failure(prepared.session_binding.status, prepared.session_binding);
      }
      if (!requiresSession(job)) {
        const result = await worker.execute(prepared.job);
        return {...result,session_binding:null};
      }

      const auth = authorizePreparedJob(prepared.job);
      if (auth.status !== 'AUTHORIZED') {
        return {ok:false,authorization:auth,session_binding:prepared.session_binding,results:[]};
      }
      if (typeof secret_resolver !== 'function') {
        return failure('HOLD_SESSION_SECRET_RESOLVER_REQUIRED', prepared.session_binding);
      }

      let resolved;
      try {
        resolved = await secret_resolver(originalBundle.transport.secret_ref, Object.freeze({
          company_id:job.company_id,
          identity_id:job.identity_id,
          environment:job.environment,
          browser_profile_id:prepared.job.browser_profile_id,
          bundle_id:originalBundle.bundle_id
        }));
      } catch (error) {
        if (String(error?.message || '').includes('DECRYPTION_FAILED')) {
          return failure('HUMAN_REQUIRED', prepared.session_binding, 'SECURITY_INCIDENT');
        }
        return failure('HOLD_SESSION_SECRET_UNAVAILABLE', prepared.session_binding);
      }
      if (!resolved?.storage_state) {
        return failure('HOLD_SESSION_SECRET_UNAVAILABLE', prepared.session_binding);
      }

      const allowedOrigins = new Set((originalBundle.allowed_origins || []).map(originOf).filter(Boolean));
      const aggregateResults = [];
      try {
        await worker.start(prepared.job);
        await worker.restoreStorageState(resolved.storage_state, {
          session_binding_authorized:true,
          company_id:job.company_id,
          identity_id:job.identity_id,
          environment:job.environment,
          browser_profile_id:prepared.job.browser_profile_id,
          bundle_id:originalBundle.bundle_id,
          attestation_fingerprint:prepared.session_binding.attestation_fingerprint
        });

        for (const action of (prepared.job.actions || [])) {
          const step = await worker.execute({
            ...prepared.job,
            actions:[action],
            keep_session_open:true,
            capture_final_evidence:false
          });
          if (!step.ok) {
            await worker.stop('AUTHENTICATED_STEP_DENIED');
            return {...step,session_binding:prepared.session_binding,results:aggregateResults};
          }
          aggregateResults.push(...(step.results || []));
          const finalOrigin = originOf(step.final_url);
          if (finalOrigin && !allowedOrigins.has(finalOrigin)) {
            await worker.stop('SESSION_ORIGIN_REDIRECT_DENIED');
            return failure('HOLD_SESSION_ORIGIN_REDIRECT_DENIED', prepared.session_binding);
          }
        }

        const final = await worker.execute({
          ...prepared.job,
          actions:[],
          keep_session_open:prepared.job.keep_session_open === true,
          capture_final_evidence:prepared.job.capture_final_evidence
        });
        if (!final.ok) return {...final,session_binding:prepared.session_binding,results:aggregateResults};
        return {
          ...final,
          results:aggregateResults,
          session_binding:prepared.session_binding,
          session_materialized:true,
          secret_ref:resolved.secret_ref || originalBundle.transport.secret_ref
        };
      } catch (error) {
        await worker.stop('SESSION_MATERIALIZATION_OR_EXECUTION_FAILED').catch(() => {});
        throw error;
      }
    }
  });
}
