package es.cerebro.worker.preprod;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class BootReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context context, Intent intent) {
    if (!DeviceState.activated(context) || DeviceState.killSwitch(context)) return;
    try {
      Intent service = new Intent(context, TransportService.class);
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service); else context.startService(service);
    } catch (Exception ignored) {
      DeviceState.setTransportStatus(context, "BOOT_RESTART_FAILED");
    }
  }
}
