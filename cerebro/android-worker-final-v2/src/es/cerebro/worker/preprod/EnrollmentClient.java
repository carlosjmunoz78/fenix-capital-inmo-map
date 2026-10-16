package es.cerebro.worker.preprod;

import android.content.Context;import org.json.JSONObject;import java.util.HashMap;import java.util.Map;

public final class EnrollmentClient {
  public static final String COMPANY_ID="fenix",ENVIRONMENT="PREPROD";
  private static final String BASE="https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-android-enrollment-preprod";
  private EnrollmentClient(){}
  public static JSONObject request(Context c)throws Exception{String token=TokenStore.getOrCreate(c);JSONObject b=new JSONObject().put("device_id",DeviceState.deviceId(c)).put("company_id",COMPANY_ID).put("environment",ENVIRONMENT).put("version",DeviceState.VERSION).put("agent_version",DeviceState.AGENT_VERSION).put("token_sha256",TokenStore.sha256(token));return HttpJson.call("POST",BASE+"/v1/request",null,b);}
  public static JSONObject status(Context c)throws Exception{String token=TokenStore.getOrCreate(c);Map<String,String>h=new HashMap<String,String>();h.put("Authorization","Bearer "+token);return HttpJson.call("GET",BASE+"/v1/status?device_id="+java.net.URLEncoder.encode(DeviceState.deviceId(c),"UTF-8"),h,null);}
}
