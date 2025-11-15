#include "handlers/SystemHandlers.h"
#include "otaUpdates/otaUpdates.h"

#include <ESPAsyncWebServer.h>
#include <Preferences.h>

void handlePairPost(AsyncWebServerRequest *request)
{
  String token;
  if (request->hasParam("token", true))
    token = request->getParam("token", true)->value();

  if (token == "my-secure-token")
  {
    request->send(200, "application/json", "{\"status\":\"paired\"}");
    Serial.println("Device paired successfully");
  }
  else
  {
    request->send(403, "application/json", "{\"status\":\"forbidden\"}");
    Serial.println("Invalid pairing token");
  }
}

// This handler should take the token that this ESP32 is regestered with from the app,
// and verify it - if valid, it should clear all stored preferences (Wifi, app pairing, etc)
void handleResetPost(AsyncWebServerRequest *request)
{
  // Clear stored preferences
  Preferences prefs;
  prefs.begin("app", false);
  String token = prefs.getString("secureToken", "");
  if (request->header("Authorization") != "Bearer " + token)
  {
    request->send(403, "application/json", "{\"status\":\"forbidden\"}");
    Serial.println("Unauthorized OTA update attempt");
    return;
  }

  prefs.clear();
  prefs.end();

  request->send(204, "application/json", "{\"status\":\"preferences cleared\"}");
  Serial.println("Device reset to factory settings");
  ESP.restart();
}

void handleTriggerOTAUpdatePost(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
{
  Preferences prefs;
  prefs.begin("app", false);
  String token = prefs.getString("secureToken", "");
  String version = prefs.getString("version", "");
  prefs.end();


  // Parse JSON body from the onRequestBody buffer (data,len)
  // Requires ArduinoJson (include <ArduinoJson.h> at top of the file)
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, data, len);
  if (err) {
    request->send(400, "application/json", "{\"status\":\"invalid json\"}");
    return;
  }

  const char *host_c = doc["host"];
  if (!host_c || host_c[0] == '\0') {
    request->send(400, "application/json", "{\"status\":\"missing host\"}");
    return;
  }

  String host = String(host_c);

  // if (request->header("Authorization") != "Bearer " + token)
  // {
  //   request->send(403, "application/json", "{\"status\":\"forbidden\"}");
  //   Serial.println("Unauthorized OTA update attempt");
  //   return;
  // }

  // Get manifest
  String manifestUrl = "http://" + host + "/api/v2/subcontrollers/firmware/esp32/manifest";
  Manifest manifest = fetchManifest(manifestUrl.c_str());
  if (manifest.version == "")
  {
    request->send(502, "application/json", "{\"status\":\"failed to fetch manifest\"}");
    return;
  }

  // Verify version
  if (!isNewerVersion(manifest.version.c_str(), version.c_str()))
  {
    request->send(304, "application/json", "{\"status\":\"firmware is up to date\"}");
    return;
  }

  // Perform update
  String firmwareURL = "http://" + host + manifest.path;
  String result = performOTAUpdate(firmwareURL.c_str(), manifest.sha256.c_str(), manifest.version);
  if (result.indexOf("error") != -1)
  {
    request->send(500, "application/json", result);
  } else {
    request->send(202, "application/json", result);
  }
  return;
}