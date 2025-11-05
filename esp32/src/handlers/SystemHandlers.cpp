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
  String host = prefs.getString("host", "");
  String version = prefs.getString("version", "");
  prefs.end();

  if (request->header("Authorization") != "Bearer " + token)
  {
    request->send(403, "application/json", "{\"status\":\"forbidden\"}");
    Serial.println("Unauthorized OTA update attempt");
    return;
  }

  // Get manifest
  String manifestUrl = "http://" + host + "/api/v2/firmware/esp32/manifest.json";
  Manifest manifest = fetchManifest(manifestUrl.c_str());
  if (manifest.version == "")
  {
    request->send(502, "application/json", "{\"error\":\"failed to fetch manifest\"}");
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
  String result = performOTAUpdate(firmwareURL.c_str(), manifest.sha256.c_str());
  if (result.indexOf("error") != -1)
  {
    request->send(200, "application/json", result);
    
    // Update version in preferences and restart
    prefs.putString("version", manifest.version);
    ESP.restart();
  } else {
    request->send(500, "application/json", result);
  }
  return;
}