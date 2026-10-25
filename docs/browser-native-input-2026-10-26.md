# Browser native input recovery

Problem: the remote viewer focuses a div rather than a native editing control; normal paste/mobile text entry is unreliable. Add a password-type native input in the address bar, focus it after page clicks, forward composition/paste/text through the existing encrypted human lease queue, and clear the local value immediately. No values stored or logged. Existing redaction and account verification preserved.

Only the Browser Console changes. Baseline main 42cc1e10; original console blob df4219e54c9e72e5678ca03aa145f78c245b6d14. Rollback restores this one file and republishes through PROD Live Deploy. Typecheck/build passed. Physical paste and typing acceptance pending deployment.

Related Work Total runtime viewport: 1100x750 only for existing workspace-enabled sessions, instead of scaling 1440x1000 down inside the viewer. Other browser jobs keep their existing default. Runtime rollback restores the prior 8002c904 version. Encrypted bundle/PROD auth tests: 18 passed. No schema, subscriptions or security relaxation.
