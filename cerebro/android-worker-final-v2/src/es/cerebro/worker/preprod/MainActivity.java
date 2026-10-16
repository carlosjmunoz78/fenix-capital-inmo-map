package es.cerebro.worker.preprod;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public final class MainActivity extends Activity {
  private TextView status;
  @Override public void onCreate(Bundle state){
    super.onCreate(state);
    ScrollView scroll=new ScrollView(this);
    LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(32,32,32,32);
    TextView title=new TextView(this);title.setText("CEREBRO Android Agent · Final V2 PREPROD");title.setTextSize(24f);box.addView(title);
    TextView note=new TextView(this);note.setText("Agente universal firmado. Mantiene kill switch, PREPROD y límites de alto riesgo. Los permisos sensibles se activarán de forma gobernada durante la aceptación física.");box.addView(note);
    status=new TextView(this);box.addView(status);
    box.addView(button("ACTIVAR CEREBRO PREPROD",new View.OnClickListener(){public void onClick(View v){activate();}}));
    box.addView(button("ABRIR ACCESIBILIDAD",new View.OnClickListener(){public void onClick(View v){startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));}}));
    box.addView(button("ABRIR ACCESO A NOTIFICACIONES",new View.OnClickListener(){public void onClick(View v){startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));}}));
    box.addView(button("ABRIR OPTIMIZACIÓN DE BATERÍA",new View.OnClickListener(){public void onClick(View v){startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));}}));
    box.addView(button("PARAR · KILL SWITCH",new View.OnClickListener(){public void onClick(View v){DeviceState.setKillSwitch(MainActivity.this,true);stopService(new Intent(MainActivity.this,TransportService.class));refresh();}}));
    box.addView(button("ACTUALIZAR ESTADO",new View.OnClickListener(){public void onClick(View v){refresh();}}));
    scroll.addView(box);setContentView(scroll);refresh();
  }
  private Button button(String text,View.OnClickListener l){Button b=new Button(this);b.setText(text);b.setOnClickListener(l);return b;}
  private void activate(){DeviceState.setActivated(this,true);DeviceState.setKillSwitch(this,false);if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},4802);Intent i=new Intent(this,TransportService.class);if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);refresh();}
  private void refresh(){status.setText("\nDevice ID: "+DeviceState.deviceId(this)+"\nVersion: "+DeviceState.VERSION+" / "+DeviceState.AGENT_VERSION+"\nActivated: "+DeviceState.activated(this)+"\nKill switch: "+(DeviceState.killSwitch(this)?"ON":"OFF")+"\nTransport: "+DeviceState.transportStatus(this)+"\nAccessibility: "+CerebroAccessibilityService.connected()+"\nNotifications: "+CerebroNotificationListenerService.connected()+"\nActive package: "+DeviceState.activePackage(this)+"\n");}
  @Override protected void onResume(){super.onResume();if(status!=null)refresh();}
}
