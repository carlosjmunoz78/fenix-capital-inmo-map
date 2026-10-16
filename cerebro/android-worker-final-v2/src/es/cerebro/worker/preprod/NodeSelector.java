package es.cerebro.worker.preprod;

import android.graphics.Rect;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONObject;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class NodeSelector {
  public static final class Match {
    public final AccessibilityNodeInfo node; public final int count; public final String error;
    Match(AccessibilityNodeInfo n,int c,String e){node=n;count=c;error=e;}
    public boolean ok(){return node!=null&&error==null;}
  }
  private NodeSelector(){}
  public static Match findUnique(AccessibilityNodeInfo root,JSONObject selector){
    if(root==null)return new Match(null,0,"ROOT_UNAVAILABLE");
    if(selector==null)return new Match(null,0,"SELECTOR_REQUIRED");
    List<AccessibilityNodeInfo> matches=new ArrayList<AccessibilityNodeInfo>();ArrayDeque<AccessibilityNodeInfo>q=new ArrayDeque<AccessibilityNodeInfo>();q.add(root);
    while(!q.isEmpty()){AccessibilityNodeInfo n=q.removeFirst();if(matches(n,selector))matches.add(n);for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo c=n.getChild(i);if(c!=null)q.add(c);}}
    if(matches.isEmpty())return new Match(null,0,"NODE_NOT_FOUND");
    if(selector.has("index")){int idx=selector.optInt("index",-1);if(idx>=0&&idx<matches.size())return new Match(matches.get(idx),matches.size(),null);return new Match(null,matches.size(),"SELECTOR_INDEX_OUT_OF_RANGE");}
    if(matches.size()!=1)return new Match(null,matches.size(),"LOW_CONFIDENCE_AMBIGUOUS_SELECTOR");
    return new Match(matches.get(0),1,null);
  }
  public static JSONObject legacy(String value){JSONObject s=new JSONObject();try{s.put("text_or_desc_contains",value==null?"":value);}catch(Exception ignored){}return s;}
  private static boolean matches(AccessibilityNodeInfo n,JSONObject s){
    if(s.has("view_id")&&!eq(n.getViewIdResourceName(),s.optString("view_id")))return false;
    if(s.has("text")&&!eq(cs(n.getText()),s.optString("text")))return false;
    if(s.has("text_contains")&&!contains(cs(n.getText()),s.optString("text_contains")))return false;
    if(s.has("desc")&&!eq(cs(n.getContentDescription()),s.optString("desc")))return false;
    if(s.has("desc_contains")&&!contains(cs(n.getContentDescription()),s.optString("desc_contains")))return false;
    if(s.has("text_or_desc_contains")){String v=s.optString("text_or_desc_contains");if(!contains(cs(n.getText()),v)&&!contains(cs(n.getContentDescription()),v))return false;}
    if(s.has("class")&&!eq(cs(n.getClassName()),s.optString("class")))return false;
    if(s.has("package")&&!eq(cs(n.getPackageName()),s.optString("package")))return false;
    if(s.has("clickable")&&n.isClickable()!=s.optBoolean("clickable"))return false;
    if(s.has("editable")&&n.isEditable()!=s.optBoolean("editable"))return false;
    if(s.has("enabled")&&n.isEnabled()!=s.optBoolean("enabled"))return false;
    if(s.has("selected")&&n.isSelected()!=s.optBoolean("selected"))return false;
    if(s.has("long_clickable")&&n.isLongClickable()!=s.optBoolean("long_clickable"))return false;
    if(s.has("bounds")){Rect r=new Rect();n.getBoundsInScreen(r);if(!r.flattenToString().equals(s.optString("bounds")))return false;}
    return true;
  }
  private static String cs(CharSequence x){return x==null?"":x.toString();}
  private static boolean eq(String a,String b){return a!=null&&b!=null&&a.equalsIgnoreCase(b);}
  private static boolean contains(String a,String b){return a!=null&&b!=null&&!b.isEmpty()&&a.toLowerCase(Locale.ROOT).contains(b.toLowerCase(Locale.ROOT));}
}
