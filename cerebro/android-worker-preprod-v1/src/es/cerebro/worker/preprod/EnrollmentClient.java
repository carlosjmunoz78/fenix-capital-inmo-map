package es.cerebro.worker.preprod;

import android.content.Context;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;

public final class EnrollmentClient {
  public static final String COMPANY_ID = "fenix";
  public static final String ENVIRONMENT = "PREPROD";
  public static final String VERSION = "android-full-control-v1";
  public static final String AGENT_VERSION = "android-worker-1.0.0";
  private static final String BASE = "https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-android-enrollment-preprod";

  private EnrollmentClient() {}

  public static JSONObject request(Context c) throws Exception {
    String token = TokenStore.getOrCreate(c);
    JSONObject b = new JSONObject();
    b.put("device_id", DeviceState.deviceId(c));
    b.put("company_id", COMPANY_ID);
    b.put("environment", ENVIRONMENT);
    b.put("version", VERSION);
    b.put("agent_version", AGENT_VERSION);
    b.put("token_sha256", TokenStore.sha256(token));
    return HttpJson.call("POST", BASE + "/v1/request", null, b);
  }

  public static JSONObject status(Context c) throws Exception {
    String token = TokenStore.getOrCreate(c);
    Map<String,String> h = new HashMap<String,String>();
    h.put("Authorization", "Bearer " + token);
    return HttpJson.call("GET", BASE + "/v1/status?device_id=" + java.net.URLEncoder.encode(DeviceState.deviceId(c), "UTF-8"), h, null);
  }
}
