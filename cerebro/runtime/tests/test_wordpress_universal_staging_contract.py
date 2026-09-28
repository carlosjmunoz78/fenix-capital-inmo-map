import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "runtime" / "contracts" / "wordpress-universal-staging-v0.json"


class UniversalPluginStagingContractTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(CONTRACT.read_text(encoding="utf-8"))

    def test_existing_runtime_must_be_wrapped_not_duplicated(self):
        policy = self.data["policy"]
        self.assertTrue(policy["wrap_existing_runtime"])
        self.assertTrue(policy["duplicate_plugin_forbidden"])
        self.assertFalse(policy["prod_mutation_authorized"])

    def test_expected_staging_route_surface_is_preserved(self):
        self.assertEqual(
            set(self.data["routes"]),
            {
                "b3/storage-observer",
                "batch/preview",
                "command",
                "command/catalog",
                "queue/submit",
                "queue/status",
                "b3/preflight",
                "status",
                "capabilities",
                "operation",
            },
        )
        self.assertEqual(self.data["qa_routes"], {"create-draft-live-once": ["POST"]})

    def test_unauthenticated_write_probe_was_blocked(self):
        obs = self.data["public_security_observation"]
        self.assertEqual(obs["protected_endpoint_status"], 401)
        self.assertEqual(obs["unauthenticated_write_probe_status"], 401)
        self.assertFalse(obs["write_performed"])

    def test_zero_cost_and_no_legacy_dependency(self):
        policy = self.data["policy"]
        self.assertEqual(policy["additional_cost_eur_target"], 0)
        self.assertFalse(policy["wpvibe_required"])
        self.assertFalse(policy["make_required"])


if __name__ == "__main__":
    unittest.main()
