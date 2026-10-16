package es.cerebro.worker.preprod;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Path;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
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
      JSONObject p = cmd.optJSONObject("payload");
      if (p == null) p = new JSONObject();
      String requested = p.optString("action", "").toUpperCase(Locale.ROOT);
      String action = "READ_SCREEN".equals(requested) ? "DESCRIBE_SCREEN" : requested;
      out.put("action", requested)
        .put("resolved_action", action)
        .put("device_id", DeviceState.deviceId(c))
        .put("at", System.currentTimeMillis());

      String denied = PolicyGuard.deny(c, cmd, p);
      if (denied != null) return fail(out, denied);

      if ("HEALTH".equals(action)) {
        return out.put("ok", true)
          .put("execution_ok", true)
          .put("semantic_verified", true)
          .put("kill_switch", DeviceState.killSwitch(c))
          .put("activated", DeviceState.activated(c))
          .put("accessibility", CerebroAccessibilityService.connected())
          .put("notifications", CerebroNotificationListenerService.connected())
          .put("active_package", DeviceState.activePackage(c))
          .put("transport", DeviceState.transportStatus(c))
          .put("capabilities", Capabilities.snapshot());
      }

      if ("CAPABILITIES".equals(action)) {
        return out.put("ok", true)
          .put("execution_ok", true)
          .put("semantic_verified", true)
          .put("capabilities", Capabilities.snapshot());
      }

      if ("OPEN_APP".equals(action)) {
        String pkg = p.optString("package", "");
        Intent i = c.getPackageManager().getLaunchIntentForPackage(pkg);
        if (i == null) {
          i = new Intent(Intent.ACTION_MAIN);
          i.addCategory(Intent.CATEGORY_LAUNCHER);
          i.setPackage(pkg);
          if (c.getPackageManager().resolveActivity(i, PackageManager.MATCH_DEFAULT_ONLY) == null) {
            return fail(out, "APP_NOT_FOUND");
          }
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        c.startActivity(i);
        return finish(c, p, out, true, false);
      }

      if ("OPEN_URL".equals(action)) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(p.optString("url")));
        String pkg = p.optString("package", "");
        if (!pkg.isEmpty()) {
          if (!PolicyGuard.allowedPackage(pkg)) return fail(out, "HUMAN_REQUIRED_HIGH_RISK");
          i.setPackage(pkg);
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        c.startActivity(i);
        return finish(c, p, out, true, false);
      }

      CerebroAccessibilityService s = CerebroAccessibilityService.get();
      if (s == null) return fail(out, "ACCESSIBILITY_NOT_CONNECTED");

      if ("GLOBAL_BACK".equals(action)) return finish(c, p, out, s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK), false);
      if ("GLOBAL_HOME".equals(action)) return finish(c, p, out, s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME), false);
      if ("GLOBAL_RECENTS".equals(action)) return finish(c, p, out, s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS), false);

      if ("CLICK_TEXT".equals(action) || "CLICK_SELECTOR".equals(action)) {
        NodeSelector.Match m = select(s, p, "CLICK_TEXT".equals(action));
        if (!m.ok()) return fail(out, m.error).put("match_count", m.count);
        return finish(c, p, out, clickUp(m.node), false).put("match_count", m.count);
      }

      if ("LONG_CLICK_SELECTOR".equals(action)) {
        NodeSelector.Match m = select(s, p, false);
        if (!m.ok()) return fail(out, m.error).put("match_count", m.count);
        boolean ok = longClickUp(m.node);
        if (!ok) {
          Rect r = new Rect();
          m.node.getBoundsInScreen(r);
          ok = press(s, r.centerX(), r.centerY(), 700);
        }
        return finish(c, p, out, ok, false).put("match_count", m.count);
      }

      if ("NODE_ACTION".equals(action)) {
        NodeSelector.Match m = select(s, p, false);
        if (!m.ok()) return fail(out, m.error).put("match_count", m.count);
        String nodeAction = p.optString("node_action", "").toUpperCase(Locale.ROOT);
        int code = nodeActionCode(nodeAction);
        if (code == 0) return fail(out, "NODE_ACTION_UNSUPPORTED");
        return finish(c, p, out, m.node.performAction(code), false)
          .put("match_count", m.count)
          .put("node_action", nodeAction);
      }

      if ("SET_TEXT".equals(action)) {
        NodeSelector.Match m = select(s, p, false);
        AccessibilityNodeInfo n = m.ok() ? m.node : null;
        if (n == null && s.getRootInActiveWindow() != null) {
          n = s.getRootInActiveWindow().findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        }
        if (n == null || n.isPassword()) return fail(out, "EDITABLE_NODE_NOT_FOUND_OR_PASSWORD");
        Bundle b = new Bundle();
        b.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, p.optString("value"));
        return finish(c, p, out, n.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, b), false);
      }

      if ("SCROLL_FORWARD".equals(action) || "SCROLL_BACKWARD".equals(action)) {
        AccessibilityNodeInfo n = findScrollable(s.getRootInActiveWindow());
        boolean ok = n != null && n.performAction("SCROLL_FORWARD".equals(action)
          ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
          : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
        return finish(c, p, out, ok, false);
      }

      if ("TAP".equals(action)) return finish(c, p, out, press(s, p.optDouble("x"), p.optDouble("y"), 80), false);
      if ("LONG_PRESS".equals(action)) return finish(c, p, out, press(s, p.optDouble("x"), p.optDouble("y"), clamp(p.optLong("duration_ms", 700), 450, 1800)), false);
      if ("DOUBLE_TAP".equals(action)) return finish(c, p, out, doubleTap(s, p.optDouble("x"), p.optDouble("y")), false);
      if ("SWIPE".equals(action)) return finish(c, p, out, stroke(s, p.optDouble("x1"), p.optDouble("y1"), p.optDouble("x2"), p.optDouble("y2"), clamp(p.optLong("duration_ms", 350), 120, 1800)), false);
      if ("DRAG".equals(action)) return finish(c, p, out, stroke(s, p.optDouble("x1"), p.optDouble("y1"), p.optDouble("x2"), p.optDouble("y2"), clamp(p.optLong("duration_ms", 650), 350, 3000)), false);

      if ("DESCRIBE_SCREEN".equals(action)) {
        return out.put("ok", true)
          .put("execution_ok", true)
          .put("semantic_verified", true)
          .put("active_package", DeviceState.activePackage(c))
          .put("nodes", describe(s.getRootInActiveWindow()));
      }

      if ("WAIT_FOR_SELECTOR".equals(action)) return waitSelector(s, p, out);
      if ("WAIT_FOR_TEXT_ABSENT".equals(action)) return waitTextAbsent(s, p, out);
      if ("WAIT_FOR_PACKAGE".equals(action)) return waitPackage(c, p, out);

      return fail(out, "ACTION_UNSUPPORTED");
    } catch (Exception e) {
      try {
        return out.put("ok", false)
          .put("execution_ok", false)
          .put("semantic_verified", false)
          .put("error", "EXECUTION_EXCEPTION")
          .put("exception", e.getClass().getSimpleName());
      } catch (Exception ignored) {
        return new JSONObject();
      }
    }
  }

  private static JSONObject finish(Context c, JSONObject p, JSONObject out, boolean executionOk, boolean intrinsicVerified) throws Exception {
    out.put("ok", executionOk).put("execution_ok", executionOk);
    if (!executionOk) return out.put("semantic_verified", false);
    boolean verified = intrinsicVerified;
    JSONObject post = p.optJSONObject("postcondition");
    if (post != null) {
      long delay = clamp(p.optLong("postcondition_delay_ms", 350), 0, 3000);
      if (delay > 0) Thread.sleep(delay);
      verified = verifyPostcondition(c, post);
      out.put("postcondition_checked", true);
    }
    return out.put("semantic_verified", verified);
  }

  private static JSONObject fail(JSONObject out, String error) throws Exception {
    return out.put("ok", false)
      .put("execution_ok", false)
      .put("semantic_verified", false)
      .put("error", error == null ? "UNKNOWN" : error);
  }

  private static NodeSelector.Match select(CerebroAccessibilityService s, JSONObject p, boolean legacy) {
    JSONObject selector = p.optJSONObject("selector");
    if (selector == null && legacy) selector = NodeSelector.legacy(p.optString("value", ""));
    return NodeSelector.findUnique(s.getRootInActiveWindow(), selector);
  }

  private static boolean clickUp(AccessibilityNodeInfo n) {
    AccessibilityNodeInfo x = n;
    while (x != null) {
      if (x.isClickable()) return x.performAction(AccessibilityNodeInfo.ACTION_CLICK);
      x = x.getParent();
    }
    return false;
  }

  private static boolean longClickUp(AccessibilityNodeInfo n) {
    AccessibilityNodeInfo x = n;
    while (x != null) {
      if (x.isLongClickable() && x.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK)) return true;
      x = x.getParent();
    }
    return false;
  }

  private static int nodeActionCode(String a) {
    if ("CLICK".equals(a)) return AccessibilityNodeInfo.ACTION_CLICK;
    if ("LONG_CLICK".equals(a)) return AccessibilityNodeInfo.ACTION_LONG_CLICK;
    if ("FOCUS".equals(a)) return AccessibilityNodeInfo.ACTION_FOCUS;
    if ("CLEAR_FOCUS".equals(a)) return AccessibilityNodeInfo.ACTION_CLEAR_FOCUS;
    if ("SELECT".equals(a)) return AccessibilityNodeInfo.ACTION_SELECT;
    if ("CLEAR_SELECTION".equals(a)) return AccessibilityNodeInfo.ACTION_CLEAR_SELECTION;
    if ("SCROLL_FORWARD".equals(a)) return AccessibilityNodeInfo.ACTION_SCROLL_FORWARD;
    if ("SCROLL_BACKWARD".equals(a)) return AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD;
    if ("EXPAND".equals(a)) return AccessibilityNodeInfo.ACTION_EXPAND;
    if ("COLLAPSE".equals(a)) return AccessibilityNodeInfo.ACTION_COLLAPSE;
    if ("DISMISS".equals(a)) return AccessibilityNodeInfo.ACTION_DISMISS;
    if ("SHOW_ON_SCREEN".equals(a) && Build.VERSION.SDK_INT >= 23) return AccessibilityNodeInfo.AccessibilityAction.ACTION_SHOW_ON_SCREEN.getId();
    if ("IME_ENTER".equals(a) && Build.VERSION.SDK_INT >= 30) return AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.getId();
    return 0;
  }

  private static boolean press(CerebroAccessibilityService s, double x, double y, long duration) throws Exception {
    Path path = new Path();
    path.moveTo((float)x, (float)y);
    return dispatch(s, new GestureDescription.Builder().addStroke(new GestureDescription.StrokeDescription(path, 0, duration)).build());
  }

  private static boolean stroke(CerebroAccessibilityService s, double x1, double y1, double x2, double y2, long duration) throws Exception {
    Path path = new Path();
    path.moveTo((float)x1, (float)y1);
    path.lineTo((float)x2, (float)y2);
    return dispatch(s, new GestureDescription.Builder().addStroke(new GestureDescription.StrokeDescription(path, 0, duration)).build());
  }

  private static boolean doubleTap(CerebroAccessibilityService s, double x, double y) throws Exception {
    Path p1 = new Path(); p1.moveTo((float)x, (float)y);
    Path p2 = new Path(); p2.moveTo((float)x, (float)y);
    GestureDescription g = new GestureDescription.Builder()
      .addStroke(new GestureDescription.StrokeDescription(p1, 0, 70))
      .addStroke(new GestureDescription.StrokeDescription(p2, 140, 70))
      .build();
    return dispatch(s, g);
  }

  private static boolean dispatch(CerebroAccessibilityService s, GestureDescription g) throws Exception {
    final CountDownLatch latch = new CountDownLatch(1);
    final boolean[] ok = new boolean[]{false};
    boolean queued = s.dispatchGesture(g, new AccessibilityService.GestureResultCallback() {
      @Override public void onCompleted(GestureDescription d) { ok[0] = true; latch.countDown(); }
      @Override public void onCancelled(GestureDescription d) { latch.countDown(); }
    }, null);
    if (!queued) return false;
    latch.await(4, TimeUnit.SECONDS);
    return ok[0];
  }

  private static AccessibilityNodeInfo findScrollable(AccessibilityNodeInfo root) {
    if (root == null) return null;
    ArrayDeque<AccessibilityNodeInfo> q = new ArrayDeque<AccessibilityNodeInfo>();
    q.add(root);
    while (!q.isEmpty()) {
      AccessibilityNodeInfo n = q.removeFirst();
      if (n.isScrollable()) return n;
      for (int i = 0; i < n.getChildCount(); i++) {
        AccessibilityNodeInfo x = n.getChild(i);
        if (x != null) q.add(x);
      }
    }
    return null;
  }

  private static JSONArray describe(AccessibilityNodeInfo root) {
    JSONArray a = new JSONArray();
    if (root == null) return a;
    ArrayDeque<AccessibilityNodeInfo> q = new ArrayDeque<AccessibilityNodeInfo>();
    q.add(root);
    while (!q.isEmpty() && a.length() < 200) {
      AccessibilityNodeInfo n = q.removeFirst();
      if (!n.isPassword()) {
        try {
          Rect r = new Rect(); n.getBoundsInScreen(r);
          JSONObject x = new JSONObject();
          x.put("class", cs(n.getClassName()))
            .put("package", cs(n.getPackageName()))
            .put("view_id", n.getViewIdResourceName())
            .put("text", clip(n.getText()))
            .put("desc", clip(n.getContentDescription()))
            .put("clickable", n.isClickable())
            .put("long_clickable", n.isLongClickable())
            .put("editable", n.isEditable())
            .put("scrollable", n.isScrollable())
            .put("focusable", n.isFocusable())
            .put("focused", n.isFocused())
            .put("selected", n.isSelected())
            .put("enabled", n.isEnabled())
            .put("child_count", n.getChildCount())
            .put("bounds", r.flattenToString());
          a.put(x);
        } catch (Exception ignored) {}
      }
      for (int i = 0; i < n.getChildCount(); i++) {
        AccessibilityNodeInfo child = n.getChild(i);
        if (child != null) q.add(child);
      }
    }
    return a;
  }

  private static String clip(CharSequence s) {
    if (s == null) return "";
    String x = s.toString();
    return x.length() > 180 ? x.substring(0, 180) : x;
  }

  private static String cs(CharSequence s) { return s == null ? "" : s.toString(); }

  private static JSONObject waitSelector(CerebroAccessibilityService s, JSONObject p, JSONObject out) throws Exception {
    long timeout = clamp(p.optLong("timeout_ms", 8000), 100, 15000);
    long end = System.currentTimeMillis() + timeout;
    JSONObject selector = p.optJSONObject("selector");
    while (System.currentTimeMillis() <= end) {
      NodeSelector.Match m = NodeSelector.findUnique(s.getRootInActiveWindow(), selector);
      if (m.ok()) return out.put("ok", true).put("execution_ok", true).put("semantic_verified", true).put("match_count", m.count);
      Thread.sleep(200);
    }
    return fail(out, "WAIT_TIMEOUT");
  }

  private static JSONObject waitTextAbsent(CerebroAccessibilityService s, JSONObject p, JSONObject out) throws Exception {
    JSONObject selector = NodeSelector.legacy(p.optString("value", ""));
    long timeout = clamp(p.optLong("timeout_ms", 8000), 100, 15000);
    long end = System.currentTimeMillis() + timeout;
    while (System.currentTimeMillis() <= end) {
      NodeSelector.Match m = NodeSelector.findUnique(s.getRootInActiveWindow(), selector);
      if ("NODE_NOT_FOUND".equals(m.error)) return out.put("ok", true).put("execution_ok", true).put("semantic_verified", true);
      Thread.sleep(200);
    }
    return fail(out, "WAIT_TIMEOUT");
  }

  private static JSONObject waitPackage(Context c, JSONObject p, JSONObject out) throws Exception {
    String target = p.optString("package", "");
    long timeout = clamp(p.optLong("timeout_ms", 8000), 100, 15000);
    long end = System.currentTimeMillis() + timeout;
    while (System.currentTimeMillis() <= end) {
      if (target.equals(DeviceState.activePackage(c))) {
        return out.put("ok", true).put("execution_ok", true).put("semantic_verified", true).put("active_package", target);
      }
      Thread.sleep(200);
    }
    return fail(out, "WAIT_TIMEOUT").put("active_package", DeviceState.activePackage(c));
  }

  private static boolean verifyPostcondition(Context c, JSONObject post) {
    try {
      if (post.has("package") && !post.optString("package").equals(DeviceState.activePackage(c))) return false;
      CerebroAccessibilityService s = CerebroAccessibilityService.get();
      if (post.has("selector")) {
        if (s == null) return false;
        NodeSelector.Match m = NodeSelector.findUnique(s.getRootInActiveWindow(), post.optJSONObject("selector"));
        boolean expected = post.optBoolean("present", true);
        if (expected && !m.ok()) return false;
        if (!expected && !"NODE_NOT_FOUND".equals(m.error)) return false;
      }
      if (post.has("text_contains")) {
        if (s == null) return false;
        NodeSelector.Match m = NodeSelector.findUnique(s.getRootInActiveWindow(), NodeSelector.legacy(post.optString("text_contains")));
        boolean expected = post.optBoolean("present", true);
        if (expected && !(m.ok() || "LOW_CONFIDENCE_AMBIGUOUS_SELECTOR".equals(m.error))) return false;
        if (!expected && !"NODE_NOT_FOUND".equals(m.error)) return false;
      }
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  private static long clamp(long v, long min, long max) { return Math.max(min, Math.min(max, v)); }
}
