package es.cerebro.worker.preprod;

import android.content.Context;import android.util.Base64;import org.json.JSONArray;import org.json.JSONObject;import java.security.SecureRandom;import java.util.HashMap;import java.util.Map;

public final class GatewayClient {
  private static final String BASE="https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-device-gateway-preprod";
  private GatewayClient(){}
  private static Map<String,String>headers(Context c)throws Exception{byte[] raw=new byte[18];new SecureRandom().nextBytes(raw);String nonce=Base64.encodeToString(raw,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);Map<String,String>h=new HashMap<String,String>();h.put("Authorization","Bearer "+TokenStore.getOrCreate(c));h.put("X-CEREBRO-Nonce",nonce);return h;}
  public static JSONObject reconnect(Context c)throws Exception{return HttpJson.call("POST",BASE+"/v1/agents/reconnect",headers(c),new JSONObject().put("device_id",DeviceState.deviceId(c)));}
  public static JSONObject poll(Context c)throws Exception{return HttpJson.call("GET",BASE+"/v1/agents/poll?device_id="+java.net.URLEncoder.encode(DeviceState.deviceId(c),"UTF-8"),headers(c),null);}
  public static JSONObject storeResult(Context c,String id,boolean verified,JSONObject result)throws Exception{return HttpJson.call("POST",BASE+"/v1/agents/result",headers(c),new JSONObject().put("device_id",DeviceState.deviceId(c)).put("command_id",id).put("semantic_verified",verified).put("result",result));}
  public static JSONObject firstCommand(JSONObject poll){JSONArray a=poll.optJSONArray("commands");return a!=null&&a.length()>0?a.optJSONObject(0):null;}
}
