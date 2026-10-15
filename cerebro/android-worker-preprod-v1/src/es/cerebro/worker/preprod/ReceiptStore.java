package es.cerebro.worker.preprod;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

public final class ReceiptStore {
  private static final String PREFS = "cerebro_receipts_preprod_v1";
  private ReceiptStore() {}
  private static SharedPreferences p(Context c){return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);}
  public static JSONObject get(Context c,String commandId){try{String x=p(c).getString("r."+commandId,null);return x==null?null:new JSONObject(x);}catch(Exception e){return null;}}
  public static void put(Context c,String commandId,boolean verified,JSONObject result){try{JSONObject x=new JSONObject().put("semantic_verified",verified).put("result",result);p(c).edit().putString("r."+commandId,x.toString()).apply();}catch(Exception ignored){}}
}
