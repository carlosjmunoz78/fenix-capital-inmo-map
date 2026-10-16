# CEREBRO Android Device Agent · Final V2

Parallel PREPROD hardening workspace. This does not replace or modify the installed V1/V2 worker until physical acceptance, rollback and promotion gates are green.

## Acceptance target

The final agent is the durable Android runtime for CEREBRO. It must provide broad device control and observation so CEREBRO can execute owner-authorized tasks, inspect state, verify outcomes and speak with the user through the phone.

### Device control
- tap, long press, double tap, swipe, drag, scroll and global navigation;
- robust semantic selectors by view id, text, content description, class, package, bounds and relationships;
- text entry, focus, submit/enter actions and waits;
- launch arbitrary ordinary apps and open HTTPS URLs with preferred-package routing when available;
- screen-tree observation plus screenshot/vision fallback where Android permits it;
- deterministic postcondition verification separate from mere action dispatch success;
- durable command journal and idempotent replay protection;
- boot/restart recovery, reconnect and health/capability reporting;
- local kill switch and fail-closed policy kernel.

### Voice and CEREBRO conversation
- user-to-CEREBRO voice orders from the phone;
- CEREBRO-to-user spoken replies through Android TTS;
- CEREBRO-originated asynchronous commands through the Gateway even when no human voice command was issued;
- voice is an interface to the Gateway, never a direct model-to-device bypass.

### Sensors and media planned for the same durable lineage
- location/geolocation for routes, navigation context and device-aware workflows;
- camera capture and inspection when explicitly enabled by the device owner;
- microphone/audio capture and playback when explicitly enabled;
- notification observation;
- battery/network/storage/device-state telemetry;
- file/share/document flows through Android system surfaces.

Android runtime permissions and OS security prompts remain authoritative. The agent must not silently bypass lockscreen, MFA, CAPTCHA, permission consent or restricted-security surfaces. High-risk, legal, signature, money, credential and security actions remain governed by CEREBRO human-exception policy.

## Deployment objective

A reusable signed deployment package must exist for additional Android terminals. The target is:

1. one permanently signed APK/update lineage;
2. one bootstrap bundle for Windows/ADB that installs the APK, verifies signature/version, performs safe repeatable setup steps and opens only the Android screens that require explicit owner consent;
3. automatic company/device enrollment through the CEREBRO Gateway;
4. automatic capability/health validation;
5. reproducible backup, rollback and rebuild instructions.

For ordinary personally managed phones, Android may still require one-time explicit approval for restricted settings such as Accessibility, notification access, camera, microphone or location. For dedicated company-owned terminals, a later fully-managed/device-owner provisioning profile may reduce manual setup further, but it must remain a separate governed deployment mode.

## Architecture rule

The APK remains a thin universal device agent. Facebook, WhatsApp, Chrome, Instagram or future applications are not hard-coded into the APK. App-specific skills/recipes live above the device layer in CEREBRO so new skills do not require reinstalling the Android agent unless a genuinely new native capability or Android permission is needed.

## Current state

- permanent signing lineage: CREATED and backed up;
- physical USB/ADB on first Samsung device: GREEN;
- installed V1/V2 workers: preserved as rollback until Final V2 acceptance;
- Final V2 source/runtime: IN HARDENING;
- physical Final V2 install: NOT YET;
- PROD authority: false until PREPROD acceptance gates are green.
