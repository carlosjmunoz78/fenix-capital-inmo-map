"""UMS-001: offline tests for the no-spend Replicate credential health probe."""
import importlib.util
import io
import json
import pathlib
import unittest
import urllib.error

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "runtime" / "replicate-credential-health-lab-v0.py"
spec = importlib.util.spec_from_file_location("replicate_health_lab", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class FakeResponse(io.BytesIO):
    status = 200
    def __enter__(self): return self
    def __exit__(self, *args): self.close()

def good_opener(req, timeout=12):
    assert req.get_method() == "GET"
    assert timeout <= 12
    url = req.full_url
    assert url.startswith("https://api.replicate.com/v1/")
    if url.endswith("/account"):
        return FakeResponse(b'{"type":"user","username":"PRIVATE_ACCOUNT_DO_NOT_LOG"}')
    if url.endswith("/models/black-forest-labs/flux-1.1-pro"):
        return FakeResponse(b'{"owner":"black-forest-labs","name":"flux-1.1-pro"}')
    raise AssertionError("Unexpected route")

class ReplicateHealthTests(unittest.TestCase):
    def test_missing_token_fails_without_network(self):
        def never(*args, **kwargs): raise AssertionError("Network requested")
        r = module.healthcheck("", never)
        self.assertEqual(r["status"], "BLOCKED_SECRET_MISSING")
        self.assertIsNone(r["account_http"])

    def test_success_is_read_only_without_identity_leak(self):
        r = module.healthcheck("r8_" + "x"*40, good_opener)
        self.assertEqual(r["status"], "AUTH_AND_MODEL_GREEN")
        self.assertFalse(r["paid_execution_enabled"])
        self.assertEqual(r["cost_eur"], 0)
        self.assertNotIn("PRIVATE_ACCOUNT", json.dumps(r))

    def test_bad_model_response_fails_closed(self):
        def wrong_model(req, timeout=12):
            if req.full_url.endswith("/account"):
                return FakeResponse(b'{"type":"user"}')
            return FakeResponse(b'{"owner":"other","name":"model"}')
        self.assertEqual(module.healthcheck("r8_" + "x"*40, wrong_model)["status"], "AUTH_OR_MODEL_BLOCKED")

    def test_auth_denied_fails_closed(self):
        def denied(req, timeout=12):
            raise urllib.error.HTTPError(req.full_url, 401, "Unauthorized", {}, None)
        r = module.healthcheck("r8_" + "x"*40, denied)
        self.assertEqual(r["status"], "AUTH_OR_MODEL_BLOCKED")
        self.assertEqual(r["account_http"], 401)

    def test_no_logging_secret_or_account_body(self):
        s = SCRIPT.read_text()
        self.assertIn('method="GET"', s)
        self.assertNotIn('method="POST"', s)
        self.assertNotIn("print(token)", s)
        self.assertNotIn("print(account)", s)

if __name__ == "__main__":
    unittest.main()
