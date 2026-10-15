package es.cerebro.worker.preprod;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public final class CerebroNotificationListenerService extends NotificationListenerService {
  private static volatile boolean connected = false;

  @Override public void onListenerConnected() { connected = true; }
  @Override public void onListenerDisconnected() { connected = false; }

  @Override public void onNotificationPosted(StatusBarNotification sbn) {
    if (sbn != null) DeviceState.noteNotification(this, sbn.getPackageName());
  }

  public static boolean connected() { return connected; }
}
