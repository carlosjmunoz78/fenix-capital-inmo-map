package es.cerebro.worker.preprod;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.UUID;

public final class DeviceState {
  public static final String VERSION = "android-device-agent-final-v2";
  public static final String AGENT_VERSION = "android-agent-2.1.0";
  private static final String PREFS = "cerebro_android_agent_final_v2";
  private static final String KEY_DEVICE_ID = "device_id";
  private static final String KEY_KILL = "kill_switch";
  private static final String KEY_STATUS = "transport_status";
  private static final String KEY_ACTIVE_PACKAGE = "active_package";
  private static final String KEY_LAST_NOTIFICATION_PACKAGE = "last_notification_package";
  private static final String KEY_LAST_NOTIFICATION_AT = "last_notification_at";
  private static final String KEY_ACTIVATED = "activated";
  private DeviceState() {}
  private static SharedPreferences p(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
  public static synchronized String deviceId(Context c) { String id=p(c).getString(KEY_DEVICE_ID,null); if(id==null||id.isEmpty()){id="android-"+UUID.randomUUID().toString();p(c).edit().putString(KEY_DEVICE_ID,id).apply();} return id; }
  public static boolean killSwitch(Context c){return p(c).getBoolean(KEY_KILL,true);} public static void setKillSwitch(Context c,boolean v){p(c).edit().putBoolean(KEY_KILL,v).apply();}
  public static boolean activated(Context c){return p(c).getBoolean(KEY_ACTIVATED,false);} public static void setActivated(Context c,boolean v){p(c).edit().putBoolean(KEY_ACTIVATED,v).apply();}
  public static String transportStatus(Context c){return p(c).getString(KEY_STATUS,"STOPPED");} public static void setTransportStatus(Context c,String v){p(c).edit().putString(KEY_STATUS,v).apply();}
  public static String activePackage(Context c){return p(c).getString(KEY_ACTIVE_PACKAGE,"");} public static void setActivePackage(Context c,String v){p(c).edit().putString(KEY_ACTIVE_PACKAGE,v==null?"":v).apply();}
  public static void noteNotification(Context c,String pkg){p(c).edit().putString(KEY_LAST_NOTIFICATION_PACKAGE,pkg==null?"":pkg).putLong(KEY_LAST_NOTIFICATION_AT,System.currentTimeMillis()).apply();}
  public static String lastNotificationPackage(Context c){return p(c).getString(KEY_LAST_NOTIFICATION_PACKAGE,"");} public static long lastNotificationAt(Context c){return p(c).getLong(KEY_LAST_NOTIFICATION_AT,0L);}
}
