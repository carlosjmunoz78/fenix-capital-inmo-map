package es.cerebro.worker.preprod;

import android.content.Context;import org.json.JSONObject;import java.net.URI;import java.util.Arrays;import java.util.HashSet;import java.util.Locale;import java.util.Set;

public final class PolicyGuard {
  private static final Set<String> ENGINES=new HashSet<String>(Arrays.asList("AUTO-001","ACTGW-001","FACT-001","APPBOOT-001","QA-001"));
  private static final String[] HIGH_RISK_TOKENS=new String[]{"bank","banco","bbva","santander","caixabank","unicaja","sabadell","bankinter","openbank","revolut","n26","wise","wallet","paypal","payment","pago","crypto","authenticator","identity","credential","password","keystore","signature","signing","legal","security","settings","deviceadmin","device_admin","packageinstaller","permissioncontroller","vpn"};
  private PolicyGuard(){}
  public static String deny(Context c,JSONObject cmd,JSONObject payload){
    if(DeviceState.killSwitch(c))return "KILL_SWITCH_ACTIVE";
    if(!"PREPROD".equalsIgnoreCase(cmd.optString("environment")))return "ENVIRONMENT_DENIED";
    String engine=cmd.optString("engine_id");if(!ENGINES.contains(engine))return "ENGINE_DENIED";
    String risk=payload.optString("risk_class","").toUpperCase(Locale.ROOT);
    if(risk.contains("HIGH")||risk.contains("MONEY")||risk.contains("PAYMENT")||risk.contains("BANK")||risk.contains("CREDENTIAL")||risk.contains("SIGNATURE")||risk.contains("LEGAL")||risk.contains("AUTH")||risk.contains("SECURITY"))return "HUMAN_REQUIRED_HIGH_RISK";
    String action=payload.optString("action","").toUpperCase(Locale.ROOT);
    if("HEALTH".equals(action)||"CAPABILITIES".equals(action))return null;
    if("OPEN_URL".equals(action)){try{URI u=URI.create(payload.optString("url",""));String host=u.getHost()==null?"":u.getHost().toLowerCase(Locale.ROOT);if(!"https".equalsIgnoreCase(u.getScheme())||host.isEmpty())return "URL_SCHEME_OR_HOST_DENIED";if(isHighRiskTarget(host))return "HUMAN_REQUIRED_HIGH_RISK";return null;}catch(Exception e){return "URL_INVALID";}}
    if("OPEN_APP".equals(action)){String pkg=payload.optString("package","");if(pkg==null||pkg.trim().isEmpty())return "PACKAGE_REQUIRED";return isHighRiskTarget(pkg)?"HUMAN_REQUIRED_HIGH_RISK":null;}
    String active=DeviceState.activePackage(c);if(active==null||active.trim().isEmpty())return "ACTIVE_PACKAGE_UNKNOWN_PREPROD";if(isHighRiskTarget(active))return "HUMAN_REQUIRED_HIGH_RISK";return null;
  }
  public static boolean allowedPackage(String pkg){return pkg!=null&&!pkg.trim().isEmpty()&&!isHighRiskTarget(pkg);}
  public static boolean isHighRiskTarget(String value){if(value==null)return true;String v=value.toLowerCase(Locale.ROOT);for(String token:HIGH_RISK_TOKENS)if(v.contains(token))return true;return false;}
}
