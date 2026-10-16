package es.cerebro.worker.preprod;

import android.content.Context;
import org.json.JSONObject;
import java.net.URI;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public final class PolicyGuard {
  private static final Set<String> UI_PACKAGES = new HashSet<String>(Arrays.asList(
    "es.cerebro.worker.preprod", "com.android.chrome", "com.sec.android.app.sbrowser", "com.android.vending"
  ));
  private static final Set<String> ENGINES = new HashSet<String>(Arrays.asList(
    "AUTO-001", "ACTGW-001", "FACT-001", "APPBOOT-001", "QA-001"
  ));
  private PolicyGuard() {}

  public static String deny(Context c, JSONObject cmd, JSONObject payload) {
    if (DeviceState.killSwitch(c)) return "KILL_SWITCH_ACTIVE";
    if (!"PREPROD".equalsIgnoreCase(cmd.optString("environment"))) return "ENVIRONMENT_DENIED";
    String engine = cmd.optString("engine_id");
    if (!ENGINES.contains(engine)) return "ENGINE_DENIED";
    String risk = payload.optString("risk_class", "").toUpperCase(Locale.ROOT);
    if (risk.contains("MONEY") || risk.contains("PAYMENT") || risk.contains("BANK") || risk.contains("CREDENTIAL") || risk.contains("SIGNATURE") || risk.contains("LEGAL") || risk.contains("AUTH")) return "HUMAN_REQUIRED_HIGH_RISK";
    String action = payload.optString("action", "").toUpperCase(Locale.ROOT);
    if ("HEALTH".equals(action)) return null;
    if ("OPEN_URL".equals(action)) {
      try {
        URI u = URI.create(payload.optString("url", ""));
        String host = u.getHost() == null ? "" : u.getHost().toLowerCase(Locale.ROOT);
        if (!"https".equalsIgnoreCase(u.getScheme())) return "URL_SCHEME_DENIED";
        if (!(host.equals("staging.fenixcapital.es") || host.equals("github.com") || host.endsWith(".github.com"))) return "URL_HOST_DENIED_PREPROD";
        return null;
      } catch (Exception e) { return "URL_INVALID"; }
    }
    if ("OPEN_APP".equals(action)) return allowedPackage(payload.optString("package", "")) ? null : "PACKAGE_DENIED_PREPROD";
    String active = DeviceState.activePackage(c);
    if (!allowedPackage(active)) return "ACTIVE_PACKAGE_DENIED_PREPROD";
    return null;
  }

  public static boolean allowedPackage(String pkg) {
    if (pkg == null || pkg.isEmpty()) return false;
    String p = pkg.toLowerCase(Locale.ROOT);
    if (p.contains("bank") || p.contains("banco") || p.contains("wallet") || p.contains("paypal") || p.contains("authenticator") || p.contains("identity")) return false;
    return UI_PACKAGES.contains(pkg);
  }
}
