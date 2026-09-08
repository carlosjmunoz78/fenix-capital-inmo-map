import pathlib
import tempfile
import unittest

from cerebro.runtime.action_gateway import ActionExecutionGateway, HumanRequired
from cerebro.runtime.chat_gateway import ConversationalGateway
from cerebro.runtime.command_router import CommandRouter
from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.console_service import CerebroConsole, ConsoleStateError
from cerebro.runtime.context_loader import ContextLoader
from cerebro.runtime.tenant_isolation import TenantIsolationGuard


class ConsoleServiceTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.registry = CompanyRegistry(pathlib.Path(self.tempdir.name) / "companies.json", environment="PREPROD")
        self.registry.register({
            "company_id": "fenix-capital", "legal_name": "Fénix Capital", "display_name": "Fénix",
            "owner": "CEREBRO Platform", "brands": ["Fénix"], "domains": ["fenix.example"],
            "geographies": ["ES"], "access_refs": ["runtime:shared"],
            "lifecycle_state": "REGISTERED", "metadata": {"source": "test"},
        })
        self.guard = TenantIsolationGuard(self.registry, environment="PREPROD")
        self.loader = ContextLoader(self.registry, self.guard)
        self.chat = ConversationalGateway(environment="PREPROD")
        self.router = CommandRouter()
        self.actions = ActionExecutionGateway(environment="PREPROD")
        self.console = CerebroConsole(self.registry, self.loader, self.chat, self.router, self.actions)

    def tearDown(self):
        self.tempdir.cleanup()

    def test_company_and_context_selectors_exist(self):
        companies = self.console.companies()
        self.assertEqual(companies[0]["company_id"], "fenix-capital")
        selected = self.console.select_context(authenticated_company_id="fenix-capital", target_company_id="fenix-capital", subject_kind="engine", subject_id="SEO-001")
        self.assertEqual(selected["subject"], {"kind": "engine", "id": "SEO-001"})

    def test_submit_requires_context_and_never_auto_executes(self):
        with self.assertRaises(ConsoleStateError):
            self.console.submit("estado")
        self.console.select_context(authenticated_company_id="fenix-capital", target_company_id="fenix-capital")
        value = self.console.submit("/run SEO-001 status")
        self.assertFalse(value["executed"])
        self.assertEqual(value["plan"]["mode"], "ENGINE_ACTION")
        self.assertFalse(value["plan"]["executable"])

    def test_read_only_execution_flows_only_through_actgw(self):
        self.actions.register_handler(engine_id="SEO-001", operation="status", effect="READ_ONLY", handler=lambda ctx, args: {"company": ctx.tenant.company_id, "status": "ok"})
        self.console.select_context(authenticated_company_id="fenix-capital", target_company_id="fenix-capital")
        self.console.submit("/run SEO-001 status")
        result = self.console.execute_last()
        self.assertEqual(result.status, "SUCCESS")
        self.assertEqual(result.output["company"], "fenix-capital")
        self.assertEqual(self.console.audit()[-1]["event"], "ACTION_EXECUTED")

    def test_query_cannot_be_executed(self):
        self.console.select_context(authenticated_company_id="fenix-capital", target_company_id="fenix-capital")
        self.console.submit("qué motores están activos")
        with self.assertRaises(HumanRequired):
            self.console.execute_last()

    def test_history_and_audit_are_recorded(self):
        self.console.select_context(authenticated_company_id="fenix-capital", target_company_id="fenix-capital")
        self.console.submit("estado")
        self.assertEqual(len(self.console.history()), 1)
        self.assertEqual([e["event"] for e in self.console.audit()], ["CONTEXT_SELECTED", "COMMAND_PLANNED"])

    def test_health_declares_no_direct_model_and_zero_cost(self):
        health = self.console.health()
        self.assertEqual(health["direct_model_binding"], "NONE")
        self.assertEqual(health["gateway"], "ACTGW-001")
        self.assertTrue(health["company_selector"])
        self.assertTrue(health["history"])
        self.assertTrue(health["audit"])
        self.assertEqual(health["external_cost_eur"], 0)
        self.assertFalse(health["prod_enabled"])


if __name__ == "__main__":
    unittest.main()
