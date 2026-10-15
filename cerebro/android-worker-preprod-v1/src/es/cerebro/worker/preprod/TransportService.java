package es.cerebro.worker.preprod;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import org.json.JSONObject;

public final class TransportService extends Service {
  private volatile boolean running = false;
  private Thread worker;

  @Override public void onCreate() {
    super.onCreate();
    createChannel();
    startForeground(4801, new Notification.Builder(this, "cerebro_preprod")
      .setContentTitle("CEREBRO PREPROD")
      .setContentText("Android Worker activo · kill switch gobernado")
      .setSmallIcon(android.R.drawable.stat_sys_download_done)
      .setOngoing(true).build());
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (running) return START_NOT_STICKY;
    running = true;
    worker = new Thread(new Runnable(){ public void run(){ loop(); } }, "cerebro-transport-preprod");
    worker.start();
    return START_NOT_STICKY;
  }

  private void loop() {
    boolean requested = false;
    while (running) {
      try {
        if (DeviceState.killSwitch(this)) {
          DeviceState.setTransportStatus(this, "KILL_SWITCH_ON");
          sleep(2000); continue;
        }
        if (!requested) {
          JSONObject r = EnrollmentClient.request(this);
          requested = true;
          DeviceState.setTransportStatus(this, r.optString("decision", "ENROLLMENT_REQUESTED"));
        }
        JSONObject s = EnrollmentClient.status(this);
        String decision = s.optString("decision", "PENDING");
        if (!"APPROVED".equals(decision)) {
          DeviceState.setTransportStatus(this, "ENROLLMENT_" + decision);
          sleep(5000); continue;
        }
        JSONObject rc = GatewayClient.reconnect(this);
        if (!"ONLINE".equals(rc.optString("status"))) throw new IllegalStateException("reconnect_failed");
        DeviceState.setTransportStatus(this, "ONLINE");
        while (running && !DeviceState.killSwitch(this)) {
          JSONObject poll = GatewayClient.poll(this);
          JSONObject cmd = GatewayClient.firstCommand(poll);
          if (cmd == null) { sleep(4000); continue; }
          String id = cmd.optString("command_id", "");
          if (id.isEmpty()) { sleep(1000); continue; }
          JSONObject cached = ReceiptStore.get(this, id);
          if (cached != null) {
            GatewayClient.storeResult(this, id, cached.optBoolean("semantic_verified", false), cached.optJSONObject("result"));
            continue;
          }
          JSONObject result = CommandExecutor.execute(this, cmd);
          boolean ok = result.optBoolean("ok", false);
          ReceiptStore.put(this, id, ok, result);
          GatewayClient.storeResult(this, id, ok, result);
        }
      } catch (Exception e) {
        DeviceState.setTransportStatus(this, "ERROR_RETRYING");
        sleep(7000);
      }
    }
    DeviceState.setTransportStatus(this, "STOPPED");
  }

  private void sleep(long ms){try{Thread.sleep(ms);}catch(InterruptedException ignored){Thread.currentThread().interrupt();}}

  private void createChannel(){
    if(Build.VERSION.SDK_INT>=26){NotificationChannel c=new NotificationChannel("cerebro_preprod","CEREBRO PREPROD",NotificationManager.IMPORTANCE_LOW);((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);}
  }

  @Override public void onDestroy(){running=false;if(worker!=null)worker.interrupt();DeviceState.setTransportStatus(this,"STOPPED");super.onDestroy();}
  @Override public IBinder onBind(Intent intent){return null;}
}
