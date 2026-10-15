package es.cerebro.worker.preprod;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.UUID;

public final class DeviceState {
  private static final String PREFS = "cerebro_worker_preprod_v1";
  private static final String KEY_DEVICE_ID = "device_id";
  private static final String KEY_KILL = "kill_switch";
  private static final String KEY_STATUS = "transport_status";
  private static final String KEY_ACTIVE_PACKAGE = "active_package";
  private static final String KEY_LAST_NOTIFICATION_PACKAGE = "last_notification_package";
  private static final String KEY_LAST_NOTIFICATION_AT = "last_notification_at";

  private DeviceState() {}

  private static SharedPreferences p(Context c) {
    return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }

  public static synchronized String deviceId(Context c) {
    String id = p(c).getString(KEY_DEVICE_ID, null);
    if (id == null || id.isEmpty()) {
      id = "android-" + UUID.randomUUID().toString();
      p(c).edit().putString(KEY_DEVICE_ID, id).apply();
    }
    return id;
  }

  public static boolean killSwitch(Context c) { return p(c).getBoolean(KEY_KILL, true); }
  public static void setKillSwitch(Context c, boolean enabled) { p(c).edit().putBoolean(KEY_KILL, enabled).apply(); }
  public static String transportStatus(Context c) { return p(c).getString(KEY_STATUS, "STOPPED"); }
  public static void setTransportStatus(Context c, String status) { p(c).edit().putString(KEY_STATUS, status).apply(); }
  public static String activePackage(Context c) { return p(c).getString(KEY_ACTIVE_PACKAGE, ""); }
  public static void setActivePackage(Context c, String pkg) { p(c).edit().putString(KEY_ACTIVE_PACKAGE, pkg == null ? "" : pkg).apply(); }
  public static void noteNotification(Context c, String pkg) {
    p(c).edit().putString(KEY_LAST_NOTIFICATION_PACKAGE, pkg == null ? "" : pkg)
      .putLong(KEY_LAST_NOTIFICATION_AT, System.currentTimeMillis()).apply();
  }
  public static String lastNotificationPackage(Context c) { return p(c).getString(KEY_LAST_NOTIFICATION_PACKAGE, ""); }
  public static long lastNotificationAt(Context c) { return p(c).getLong(KEY_LAST_NOTIFICATION_AT, 0L); }
}
