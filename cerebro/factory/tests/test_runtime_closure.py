import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CLOSURE = ROOT / "governance" / "runtime-closure.json"
GATEWAY = ROOT / "governance" / "gateway-rpc-inventory.json"


def load(path=CLOSURE):
    return json.loads(path.read_text(encoding="utf-8"))


class RuntimeClosureTests(unittest.TestCase):
    def test_closure_ids_are_unique(self):
        data = load()
        ids = [x["id"] for x in data["closures"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_all_recorded_closures_are_classified(self):
        data = load()
        allowed = {"VERIFIED_SOURCE_AND_LIVE_EDGE", "VERIFIED_LIVE", "VERIFIED_LIVE_SOURCE"}
        self.assertTrue(data["closures"])
        self.assertTrue(all(x["status"] in allowed for x in data["closures"]))

    def test_direction_kpis_is_preprod_only_and_fail_closed_in_prod(self):
        data = load()
        kpi = next(x for x in data["closures"] if x["id"] == "direction-kpi-drilldown")
        self.assertEqual(kpi["environment"], "PREPROD")
        self.assertEqual(kpi["live_edge"]["slug"], "fenix-direction-kpis-test")
        self.assertEqual(kpi["prod_policy"], "FAIL_CLOSED_503")
        drift = next(x for x in data["classified_drift"] if x["id"] == "DRIFT-DIRECTION-KPIS-001")
        self.assertEqual(drift["classification"], "EXPECTED_ENVIRONMENT_SPLIT_NOT_PROD_BREAK")
        self.assertFalse(drift["prod_deploy_authorized"])

    def test_prod_direction_dashboard_uses_gateway(self):
        data = load()
        live = next(x for x in data["closures"] if x["id"] == "direction-live-dashboard")
        self.assertEqual(live["environment"], "PROD")
        self.assertIn("fenix-app-gateway", live["path"])
        self.assertNotIn("fenix-direction-kpis", live["path"])

    def test_gateway_rpc_inventory_is_unique_complete_and_read_only_audited(self):
        data = load(GATEWAY)
        rpcs = data["rpc_names"]
        self.assertEqual(data["expected_rpc_count"], 51)
        self.assertEqual(len(rpcs), 51)
        self.assertEqual(len(rpcs), len(set(rpcs)))
        self.assertTrue(data["all_expected_rpcs_exist_live"])
        self.assertFalse(data["mutation_performed"])
        self.assertIn("fenix-prod-documents", data["storage"])
        self.assertIn("actors", data["literal_fenix_prod_object_refs_observed"])
        self.assertIn("expedientes", data["literal_fenix_prod_object_refs_observed"])
        self.assertIn("documentos", data["literal_fenix_prod_object_refs_observed"])

    def test_no_record_authorizes_prod_deployment(self):
        data = load()
        for drift in data.get("classified_drift", []):
            self.assertFalse(drift.get("prod_deploy_authorized", False))


if __name__ == "__main__":
    unittest.main()
