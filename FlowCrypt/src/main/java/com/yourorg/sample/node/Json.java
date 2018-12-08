package com.yourorg.sample.node;

import com.yourorg.sample.node.results.PgpKeyInfo;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class Json extends JSONObject {

  void putStringArr (String name, String[] arr) {
    JSONArray pubKeysJsonArr = new JSONArray();
    for(String string: arr) {
      pubKeysJsonArr.put(string);
    }
    try {
      this.put(name, pubKeysJsonArr);
    } catch (JSONException e) {
      throw new RuntimeException("Unexpected JSONException", e);
    }
  }

  void putPrvKeyInfoArr (String name, PgpKeyInfo[] keys) {
    try {
      JSONArray prvKeyInfoArr = new JSONArray();
      for(PgpKeyInfo key: keys) {
        Json ki = new Json();
        ki.putString("private", key.getPrivate());
        ki.putString("longid", key.getLongid());
        prvKeyInfoArr.put(ki);
      }
      this.put(name, prvKeyInfoArr);
    } catch (JSONException e) {
      throw new RuntimeException("Unexpected JSONException", e);
    }
  }

  void putString (String name, String string) {
    if(string != null) {
      try {
        this.put(name, string);
      } catch (JSONException e) {
        throw new RuntimeException("Unexpected JSONException", e);
      }
    }
  }
}
