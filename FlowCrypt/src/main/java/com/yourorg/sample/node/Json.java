package com.yourorg.sample.node;

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
