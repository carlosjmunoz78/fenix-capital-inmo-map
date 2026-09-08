import pathlib
import tempfile
import unittest

from cerebro.runtime.chat_gateway import ConversationalGateway
from cerebro.runtime.command_router import CommandPolicyConflict, CommandRouter
from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.context_loader import ContextLoader
from cerebro.runtime.tenant_isolation import TenantIsolationGuard


class CommandRouterTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.registry = CompanyRegistry(pathlib.Path(self.tempdir.name) / "companies.json", environment="PREPROD")
        for cid, name in (("fenix-capital", "Fénix Capital"), ("acme-holdings", "Acme Holdings")):
            self.registry.register({
                "company_id": cid, "legal_name": name, "display_name": name,
                "owner": "CEREBRO Platform", "brands": [name], "domains": [f"{cid}.example"],
                "geographies": ["ES"], "access_refs": ["runtime:shared"],
                "lifecycle_state": "REGISTERED", "metadata": {"source": "test"},
            })
        self.guard = TenantIsolationGuard(self.registry, environment="PREPROD")
        self.loader = ContextLoader(self.registry, self.guard)
        self.chat = ConversationalGateway(environment="PREPROD")
        self.router = CommandRouter()

    def tearDown(self):
        self.tempdir.cleanup()

    def context(self, cid="fenix-capital"):
        return self.loader.load(authenticated_company_id=cid, target_company_id=cid)

    def test_plain_message_is_non_executable_query(self):
        envelope = self.chat.prepare(company_id="fenix-capital", text="estado de los motores")
        plan = self.router.route(envelope, self.context())
        self.assertEqual(plan.mode, "QUERY")
        self.assertEqual(plan.operation, "answer")
        self.assertFalse(plan.executable)

    def test_run_syntax_routes_but_does_not_execute(self):
        envelope = self.chat.prepare(company_id="fenix-capital", text="/run SEO-001 audit homepage")
        plan = self.router.route(envelope, self.context())
        self.assertEqual(plan.mode, "ENGINE_ACTION")
        self.assertEqual(plan.target_engine_id, "SEO-001")
        self.assertEqual(plan.operation, "audit")
        self.assertEqual(plan.arguments, "homepage")
        self.assertFalse(plan.executable)

    def test_orchestrate_syntax_is_distinct(self):
        envelope = self.chat.prepare(company_id="fenix-capital", text="/orchestrate COMP-ONB-001 start")
        plan = self.router.route(envelope, self.context())
        self.assertEqual(plan.mode, "ORCHESTRATION")
        self.assertEqual(plan.target_engine_id, "COMP-ONB-001")

    def test_company_mismatch_is_policy_conflict(self):
        envelope = self.chat.prepare(company_id="acme-holdings", text="estado")
        with self.assertRaises(CommandPolicyConflict) as caught:
            self.router.route(envelope, self.context("fenix-capital"))
        self.assertEqual(caught.exception.human_required_code, "POLICY_CONFLICT")

    def test_health_denies_execution_and_prod(self):
        health = self.router.health()
        self.assertEqual(health["execution"], "DENY")
        self.assertEqual(health["model_binding"], "NONE")
        self.assertTrue(health["explicit_action_syntax_required"])
        self.assertEqual(health["external_cost_eur"], 0)
        self.assertFalse(health["prod_enabled"])


if __name__ == "__main__":
    unittest.main()
