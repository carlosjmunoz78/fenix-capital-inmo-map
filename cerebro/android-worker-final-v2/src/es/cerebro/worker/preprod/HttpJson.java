package es.cerebro.worker.preprod;

import org.json.JSONObject;import java.io.BufferedReader;import java.io.InputStream;import java.io.InputStreamReader;import java.io.OutputStream;import java.net.HttpURLConnection;import java.net.URL;import java.nio.charset.StandardCharsets;import java.util.Map;

public final class HttpJson {
  private HttpJson(){}
  public static JSONObject call(String method,String url,Map<String,String> headers,JSONObject body)throws Exception{
    HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setRequestMethod(method);c.setConnectTimeout(10000);c.setReadTimeout(25000);c.setUseCaches(false);c.setRequestProperty("Accept","application/json");
    if(headers!=null)for(Map.Entry<String,String>e:headers.entrySet())c.setRequestProperty(e.getKey(),e.getValue());
    if(body!=null){byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json; charset=utf-8");c.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=c.getOutputStream()){out.write(bytes);}}
    int status=c.getResponseCode();InputStream in=status>=200&&status<400?c.getInputStream():c.getErrorStream();StringBuilder text=new StringBuilder();if(in!=null)try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){String line;while((line=r.readLine())!=null)text.append(line);}c.disconnect();JSONObject out=text.length()==0?new JSONObject():new JSONObject(text.toString());out.put("_http_status",status);return out;
  }
}
