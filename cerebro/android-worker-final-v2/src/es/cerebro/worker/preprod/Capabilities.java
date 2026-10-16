package es.cerebro.worker.preprod;

import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

public final class Capabilities {
  private Capabilities(){}
  public static JSONObject snapshot(){
    JSONObject out=new JSONObject();
    try{
      out.put("version",DeviceState.VERSION).put("agent_version",DeviceState.AGENT_VERSION).put("sdk",Build.VERSION.SDK_INT);
      JSONArray actions=new JSONArray();
      String[] names=new String[]{"HEALTH","CAPABILITIES","OPEN_APP","OPEN_URL","GLOBAL_HOME","GLOBAL_BACK","GLOBAL_RECENTS","CLICK_TEXT","CLICK_SELECTOR","LONG_CLICK_SELECTOR","NODE_ACTION","SET_TEXT","SCROLL_FORWARD","SCROLL_BACKWARD","TAP","LONG_PRESS","DOUBLE_TAP","SWIPE","DRAG","DESCRIBE_SCREEN","WAIT_FOR_SELECTOR","WAIT_FOR_PACKAGE","WAIT_FOR_TEXT_ABSENT"};
      for(String n:names)actions.put(n);
      out.put("actions",actions);
      out.put("call_capture_contract","ADAPTER_REQUIRED");
      out.put("voice_message_contract","SERVER_SIDE_SKILL_REQUIRED");
      out.put("location_contract","PERMISSION_GATED_MODULE");
      out.put("camera_contract","PERMISSION_GATED_MODULE");
      out.put("microphone_contract","PERMISSION_GATED_MODULE");
    }catch(Exception ignored){}
    return out;
  }
}
