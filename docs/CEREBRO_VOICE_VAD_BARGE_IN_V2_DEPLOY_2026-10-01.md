# CEREBRO Voice VAD Barge-in V2 · deploy marker

Date: 2026-10-01
Company: fenix
Additional recurring cost: 0 EUR

Reason for strategy change:
- Physical test confirmed that SpeechRecognition running while speechSynthesis speaks did not provide a usable verbal "para" interruption on the real browser/device.
- Per anti-loop policy, this release changes mechanism rather than retrying the same approach.

Implementation:
- local microphone voice-activity detection with getUserMedia + Web Audio API;
- echoCancellation, noiseSuppression and autoGainControl requested;
- adaptive room-noise and speaker-echo threshold;
- sustained-frame requirement to reject isolated noise spikes;
- while CEREBRO speaks, sustained user speech cancels TTS and returns immediately to normal SpeechRecognition;
- the user no longer needs a specific keyword: starting to speak is the interruption gesture;
- previous exact verbal-command SpeechRecognition remains fallback only when local VAD cannot be prepared;
- full written response, action confirmations and permissions remain unchanged.

Evidence before promotion:
- PR #469 exact head: 15426ddbcbc014564ead6df7d64a1b7a17bfb19a
- CEREBRO Session Context Regression Guard #139: SUCCESS
- App Restoration Build Gate #385: SUCCESS
- local VAD behavioral corpus: GREEN
- merge: b6146c3ded1efd2345a805dba5b068ccd9fdb66a
- previous exact frontend rollback source: d8b89b4f1f541d5d7ebea1ab5fd5cd8446a4bc43

Physical acceptance remains mandatory after deployment.
