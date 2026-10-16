package es.cerebro.worker.preprod;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;

public final class CerebroAccessibilityService extends AccessibilityService {
  private static volatile CerebroAccessibilityService instance;
  @Override protected void onServiceConnected(){super.onServiceConnected();instance=this;}
  @Override public void onAccessibilityEvent(AccessibilityEvent event){if(event==null)return;CharSequence p=event.getPackageName();if(p!=null)DeviceState.setActivePackage(this,p.toString());}
  @Override public void onInterrupt(){}
  @Override public void onDestroy(){if(instance==this)instance=null;super.onDestroy();}
  public static CerebroAccessibilityService get(){return instance;}
  public static boolean connected(){return instance!=null;}
}
