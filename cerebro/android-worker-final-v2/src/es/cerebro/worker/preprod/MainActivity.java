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
    TextView title=new TextView(this);title.setText("CEREBRO en el móvil · versión de pruebas");title.setTextSize(24f);box.addView(title);
    TextView note=new TextView(this);note.setText("Desde aquí conectas este teléfono con CEREBRO. Las funciones sensibles se activan de forma controlada y siempre puedes detener CEREBRO con la parada de emergencia.");box.addView(note);
    status=new TextView(this);box.addView(status);
    box.addView(button("ACTIVAR CEREBRO",new View.OnClickListener(){public void onClick(View v){activate();}}));
    box.addView(button("PERMITIR CONTROL DEL TELÉFONO",new View.OnClickListener(){public void onClick(View v){startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));}}));
    box.addView(button("PERMITIR LEER NOTIFICACIONES",new View.OnClickListener(){public void onClick(View v){startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));}}));
    box.addView(button("AJUSTAR AHORRO DE BATERÍA",new View.OnClickListener(){public void onClick(View v){startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));}}));
    box.addView(button("PARADA DE EMERGENCIA",new View.OnClickListener(){public void onClick(View v){DeviceState.setKillSwitch(MainActivity.this,true);stopService(new Intent(MainActivity.this,TransportService.class));refresh();}}));
    box.addView(button("ACTUALIZAR ESTADO",new View.OnClickListener(){public void onClick(View v){refresh();}}));
    scroll.addView(box);setContentView(scroll);refresh();
  }
  private Button button(String text,View.OnClickListener l){Button b=new Button(this);b.setText(text);b.setOnClickListener(l);return b;}
  private String siNo(boolean value){return value?"Sí":"No";}
  private String transportHumano(String value){
    if(value==null||value.length()==0)return "Todavía sin conexión";
    if("ONLINE".equals(value))return "Conectado con CEREBRO";
    if("STOPPED".equals(value))return "Detenido";
    if("ERROR_RETRYING".equals(value))return "Error temporal. Reintentando automáticamente";
    if("KILL_SWITCH_ON".equals(value))return "Detenido por la parada de emergencia";
    if(value.startsWith("ENROLLMENT_APPROVED"))return "Teléfono autorizado";
    if(value.startsWith("ENROLLMENT_PENDING"))return "Pendiente de autorización";
    if(value.startsWith("ENROLLMENT_EXPIRED"))return "Autorización caducada. Hay que renovarla";
    if(value.startsWith("ENROLLMENT_"))return "Autorización: "+value.substring("ENROLLMENT_".length()).replace('_',' ');
    return value.replace('_',' ');
  }
  private void activate(){DeviceState.setActivated(this,true);DeviceState.setKillSwitch(this,false);if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},4802);Intent i=new Intent(this,TransportService.class);if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);refresh();}
  private void refresh(){status.setText("\nEstado del teléfono\n\nIdentificador: "+DeviceState.deviceId(this)+"\nVersión de CEREBRO: "+DeviceState.VERSION+" / "+DeviceState.AGENT_VERSION+"\nCEREBRO activado: "+siNo(DeviceState.activated(this))+"\nParada de emergencia: "+(DeviceState.killSwitch(this)?"ACTIVADA":"Desactivada")+"\nConexión con CEREBRO: "+transportHumano(DeviceState.transportStatus(this))+"\nControl del teléfono: "+(CerebroAccessibilityService.connected()?"Permitido":"Pendiente de permiso")+"\nLectura de notificaciones: "+(CerebroNotificationListenerService.connected()?"Permitida":"Pendiente de permiso")+"\nAplicación en pantalla: "+DeviceState.activePackage(this)+"\n");}
  @Override protected void onResume(){super.onResume();if(status!=null)refresh();}
}
