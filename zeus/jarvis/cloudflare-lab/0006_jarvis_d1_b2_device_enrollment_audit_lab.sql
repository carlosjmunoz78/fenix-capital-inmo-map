-- CUT32 candidate ONLY: append-only audit for an explicitly approved, short LAB
-- device enrollment window. Apply to dedicated EU D1 after backup, never PROD.
-- Additive; no owner enrolled, no API enabled, zero default grants.
CREATE TABLE IF NOT EXISTS jarvis_lab_b2_device_enrollment_audit_v0 (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL CHECK(length(owner_id) BETWEEN 1 AND 100),
  session_hmac TEXT NOT NULL CHECK(length(session_hmac)=64
    AND session_hmac NOT GLOB '*[^0-9a-f]*'),
  event_code TEXT NOT NULL CHECK(event_code='ENROLLED'),
  environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
  issued_at_ms INTEGER NOT NULL CHECK(issued_at_ms>0),
  expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms>issued_at_ms)
);
CREATE INDEX IF NOT EXISTS jarvis_lab_b2_device_enrolled_ts_v0
 ON jarvis_lab_b2_device_enrollment_audit_v0(issued_at_ms);
CREATE TRIGGER IF NOT EXISTS jarvis_lab_b2_device_enrollment_audit_no_update_v0
 BEFORE UPDATE ON jarvis_lab_b2_device_enrollment_audit_v0
 BEGIN SELECT RAISE(ABORT,'B2_DEVICE_ENROLLMENT_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS jarvis_lab_b2_device_enrollment_audit_no_delete_v0
 BEFORE DELETE ON jarvis_lab_b2_device_enrollment_audit_v0
 BEGIN SELECT RAISE(ABORT,'B2_DEVICE_ENROLLMENT_APPEND_ONLY'); END;
