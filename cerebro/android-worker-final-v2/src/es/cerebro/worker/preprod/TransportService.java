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
  private volatile boolean running=false; private Thread worker;
  @Override public void onCreate(){super.onCreate();createChannel();startForeground(4802,new Notification.Builder(this,"cerebro_final_v2").setContentTitle("CEREBRO Android Agent").setContentText("Final V2 PREPROD activo · control gobernado").setSmallIcon(android.R.drawable.stat_sys_download_done).setOngoing(true).build());}
  @Override public int onStartCommand(Intent intent,int flags,int startId){if(running)return START_STICKY;running=true;worker=new Thread(new Runnable(){public void run(){loop();}},"cerebro-transport-final-v2");worker.start();return START_STICKY;}

  private void loop(){boolean requested=false;while(running){try{
    if(DeviceState.killSwitch(this)){DeviceState.setTransportStatus(this,"KILL_SWITCH_ON");sleep(2000);continue;}
    if(!requested){JSONObject r=EnrollmentClient.request(this);requested=true;DeviceState.setTransportStatus(this,r.optString("decision","ENROLLMENT_REQUESTED"));}
    JSONObject status=EnrollmentClient.status(this);String decision=status.optString("decision","PENDING");
    if(!"APPROVED".equals(decision)){DeviceState.setTransportStatus(this,"ENROLLMENT_"+decision);sleep(5000);continue;}
    JSONObject rc=GatewayClient.reconnect(this);if(!"ONLINE".equals(rc.optString("status")))throw new IllegalStateException("reconnect_failed");DeviceState.setTransportStatus(this,"ONLINE");
    while(running&&!DeviceState.killSwitch(this)){
      JSONObject poll=GatewayClient.poll(this);JSONObject cmd=GatewayClient.firstCommand(poll);if(cmd==null){sleep(3000);continue;}
      String id=cmd.optString("command_id","");if(id.isEmpty()){sleep(500);continue;}
      JSONObject payload=cmd.optJSONObject("payload");String payloadHash=TokenStore.sha256(payload==null?"{}":payload.toString());
      JSONObject cached=CommandJournal.get(this).find(id);
      if(cached!=null){
        if(!payloadHash.equals(cached.optString("payload_hash"))){JSONObject mismatch=new JSONObject().put("ok",false).put("execution_ok",false).put("semantic_verified",false).put("error","COMMAND_ID_PAYLOAD_HASH_MISMATCH");GatewayClient.storeResult(this,id,false,mismatch);continue;}
        GatewayClient.storeResult(this,id,cached.optBoolean("semantic_verified",false),cached.optJSONObject("result"));continue;
      }
      JSONObject result=CommandExecutor.execute(this,cmd);boolean executionOk=result.optBoolean("execution_ok",result.optBoolean("ok",false));boolean semanticVerified=result.optBoolean("semantic_verified",false);
      CommandJournal.get(this).put(id,payloadHash,executionOk,semanticVerified,result);
      GatewayClient.storeResult(this,id,semanticVerified,result);
    }
  }catch(Exception e){DeviceState.setTransportStatus(this,"ERROR_RETRYING");sleep(6000);}}
    DeviceState.setTransportStatus(this,"STOPPED");
  }
  private void sleep(long ms){try{Thread.sleep(ms);}catch(InterruptedException ignored){Thread.currentThread().interrupt();}}
  private void createChannel(){if(Build.VERSION.SDK_INT>=26){NotificationChannel c=new NotificationChannel("cerebro_final_v2","CEREBRO Android Agent",NotificationManager.IMPORTANCE_LOW);((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);}}
  @Override public void onDestroy(){running=false;if(worker!=null)worker.interrupt();DeviceState.setTransportStatus(this,"STOPPED");super.onDestroy();}
  @Override public IBinder onBind(Intent intent){return null;}
}
