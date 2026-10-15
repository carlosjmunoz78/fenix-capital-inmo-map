package es.cerebro.worker.preprod;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.Context;
import android.content.Intent;
import android.graphics.Path;
import android.net.Uri;
import android.os.Bundle;
import android.graphics.Rect;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayDeque;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public final class CommandExecutor {
  private CommandExecutor() {}

  public static JSONObject execute(Context c, JSONObject cmd) {
    JSONObject out = new JSONObject();
    try {
      JSONObject p = cmd.optJSONObject("payload"); if (p == null) p = new JSONObject();
      String action = p.optString("action", "").toUpperCase(Locale.ROOT);
      out.put("action", action).put("device_id", DeviceState.deviceId(c)).put("at", System.currentTimeMillis());
      String denied = PolicyGuard.deny(c, cmd, p);
      if (denied != null) return out.put("ok", false).put("error", denied);
      if ("HEALTH".equals(action)) return out.put("ok", true).put("kill_switch", DeviceState.killSwitch(c)).put("accessibility", CerebroAccessibilityService.connected()).put("notifications", CerebroNotificationListenerService.connected()).put("active_package", DeviceState.activePackage(c));
      if ("OPEN_APP".equals(action)) {
        Intent i = c.getPackageManager().getLaunchIntentForPackage(p.optString("package"));
        if (i == null) return out.put("ok", false).put("error", "APP_NOT_FOUND");
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); return out.put("ok", true);
      }
      if ("OPEN_URL".equals(action)) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(p.optString("url"))); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); c.startActivity(i); return out.put("ok", true);
      }
      CerebroAccessibilityService s = CerebroAccessibilityService.get();
      if (s == null) return out.put("ok", false).put("error", "ACCESSIBILITY_NOT_CONNECTED");
      if ("GLOBAL_BACK".equals(action)) return out.put("ok", s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK));
      if ("GLOBAL_HOME".equals(action)) return out.put("ok", s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME));
      if ("GLOBAL_RECENTS".equals(action)) return out.put("ok", s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS));
      if ("CLICK_TEXT".equals(action)) return out.put("ok", click(find(s.getRootInActiveWindow(), p.optString("value"))));
      if ("SET_TEXT".equals(action)) {
        AccessibilityNodeInfo n = find(s.getRootInActiveWindow(), p.optString("selector"));
        if (n == null && s.getRootInActiveWindow() != null) n = s.getRootInActiveWindow().findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (n == null || n.isPassword()) return out.put("ok", false).put("error", "EDITABLE_NODE_NOT_FOUND_OR_PASSWORD");
        Bundle b = new Bundle(); b.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, p.optString("value"));
        return out.put("ok", n.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, b));
      }
      if ("SCROLL_FORWARD".equals(action) || "SCROLL_BACKWARD".equals(action)) {
        AccessibilityNodeInfo n = findScrollable(s.getRootInActiveWindow());
        return out.put("ok", n != null && n.performAction("SCROLL_FORWARD".equals(action) ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD));
      }
      if ("TAP".equals(action)) {
        final CountDownLatch latch = new CountDownLatch(1); final boolean[] ok = new boolean[]{false}; Path path = new Path(); path.moveTo((float)p.optDouble("x"), (float)p.optDouble("y"));
        GestureDescription g = new GestureDescription.Builder().addStroke(new GestureDescription.StrokeDescription(path,0,80)).build();
        s.dispatchGesture(g, new AccessibilityService.GestureResultCallback(){@Override public void onCompleted(GestureDescription x){ok[0]=true;latch.countDown();}@Override public void onCancelled(GestureDescription x){latch.countDown();}}, null);
        latch.await(3, TimeUnit.SECONDS); return out.put("ok", ok[0]);
      }
      if ("DESCRIBE_SCREEN".equals(action)) return out.put("ok", true).put("nodes", describe(s.getRootInActiveWindow()));
      return out.put("ok", false).put("error", "ACTION_UNSUPPORTED");
    } catch (Exception e) { try { return out.put("ok", false).put("error", "EXECUTION_EXCEPTION"); } catch(Exception ignored){ return new JSONObject(); } }
  }

  private static AccessibilityNodeInfo find(AccessibilityNodeInfo root, String needle) {
    if (root == null || needle == null || needle.isEmpty()) return null; String q=needle.toLowerCase(Locale.ROOT); ArrayDeque<AccessibilityNodeInfo> z=new ArrayDeque<AccessibilityNodeInfo>(); z.add(root);
    while(!z.isEmpty()){AccessibilityNodeInfo n=z.removeFirst(); CharSequence t=n.getText(),d=n.getContentDescription(); if((t!=null&&t.toString().toLowerCase(Locale.ROOT).contains(q))||(d!=null&&d.toString().toLowerCase(Locale.ROOT).contains(q))) return n; for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo x=n.getChild(i);if(x!=null)z.add(x);}}
    return null;
  }
  private static boolean click(AccessibilityNodeInfo n){while(n!=null){if(n.isClickable())return n.performAction(AccessibilityNodeInfo.ACTION_CLICK); n=n.getParent();}return false;}
  private static AccessibilityNodeInfo findScrollable(AccessibilityNodeInfo root){if(root==null)return null;ArrayDeque<AccessibilityNodeInfo>q=new ArrayDeque<AccessibilityNodeInfo>();q.add(root);while(!q.isEmpty()){AccessibilityNodeInfo n=q.removeFirst();if(n.isScrollable())return n;for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo x=n.getChild(i);if(x!=null)q.add(x);}}return null;}
  private static JSONArray describe(AccessibilityNodeInfo root){JSONArray a=new JSONArray();if(root==null)return a;ArrayDeque<AccessibilityNodeInfo>q=new ArrayDeque<AccessibilityNodeInfo>();q.add(root);while(!q.isEmpty()&&a.length()<100){AccessibilityNodeInfo n=q.removeFirst();if(!n.isPassword()){JSONObject x=new JSONObject();try{Rect r=new Rect();n.getBoundsInScreen(r);x.put("class",String.valueOf(n.getClassName())).put("view_id",n.getViewIdResourceName()).put("text",clip(n.getText())).put("desc",clip(n.getContentDescription())).put("clickable",n.isClickable()).put("editable",n.isEditable()).put("bounds",r.flattenToString());a.put(x);}catch(Exception ignored){}}for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo c=n.getChild(i);if(c!=null)q.add(c);}}return a;}
  private static String clip(CharSequence s){if(s==null)return "";String x=s.toString();return x.length()>120?x.substring(0,120):x;}
}
