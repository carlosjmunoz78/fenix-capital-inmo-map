package es.cerebro.worker.preprod;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONObject;

public final class CommandJournal extends SQLiteOpenHelper {
  private static final String DB="cerebro_android_final_v2.db";
  private static final int VERSION=1;
  private static CommandJournal instance;
  private CommandJournal(Context c){super(c,DB,null,VERSION);}
  public static synchronized CommandJournal get(Context c){if(instance==null)instance=new CommandJournal(c.getApplicationContext());return instance;}
  @Override public void onCreate(SQLiteDatabase db){db.execSQL("CREATE TABLE command_journal(command_id TEXT PRIMARY KEY,payload_hash TEXT,execution_ok INTEGER NOT NULL,semantic_verified INTEGER NOT NULL,result_json TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 1)");}
  @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){}
  public synchronized JSONObject find(String commandId){Cursor cur=null;try{cur=getReadableDatabase().query("command_journal",new String[]{"payload_hash","execution_ok","semantic_verified","result_json","created_at","updated_at","attempts"},"command_id=?",new String[]{commandId},null,null,null);if(!cur.moveToFirst())return null;JSONObject o=new JSONObject();o.put("payload_hash",cur.getString(0));o.put("execution_ok",cur.getInt(1)!=0);o.put("semantic_verified",cur.getInt(2)!=0);String r=cur.getString(3);o.put("result",r==null?new JSONObject():new JSONObject(r));o.put("created_at",cur.getLong(4));o.put("updated_at",cur.getLong(5));o.put("attempts",cur.getInt(6));return o;}catch(Exception e){return null;}finally{if(cur!=null)cur.close();}}
  public synchronized void put(String commandId,String payloadHash,boolean executionOk,boolean semanticVerified,JSONObject result){long now=System.currentTimeMillis();SQLiteDatabase db=getWritableDatabase();JSONObject existing=find(commandId);ContentValues v=new ContentValues();v.put("command_id",commandId);v.put("payload_hash",payloadHash);v.put("execution_ok",executionOk?1:0);v.put("semantic_verified",semanticVerified?1:0);v.put("result_json",result==null?"{}":result.toString());v.put("updated_at",now);if(existing==null){v.put("created_at",now);v.put("attempts",1);db.insertOrThrow("command_journal",null,v);}else{v.put("attempts",existing.optInt("attempts",1)+1);db.update("command_journal",v,"command_id=?",new String[]{commandId});}}
}
