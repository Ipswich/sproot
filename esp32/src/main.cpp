#include <DNSServer.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <WiFi.h>

#include "servers/Normal.h"
#include "servers/SoftAP.h"
#include "wifi/WifiConnectState.h"

AsyncWebServer server(80);
Preferences prefs;
DNSServer dnsServer;

enum ServerMode {
  MODE_UNDEFINED = 0,
  MODE_NORMAL = 1,
  MODE_SOFT_AP = 2
};
int server_mode = MODE_UNDEFINED;

String savedSSID;
String savedPASS;

unsigned long lastWiFiCheck = 0;
const unsigned long wifiCheckInterval = 10000; // 10 seconds
const unsigned long connectTimeoutMs = 15000;
const unsigned long connectedGraceMs = 3500;

void switchToNormalMode() {
  stopSoftAPMode(server, dnsServer);
  WiFi.softAPdisconnect(true);
  startNormalMode(server);
  server_mode = MODE_NORMAL;
}

void switchToCaptivePortal() {
  stopNormalMode(server);
  startSoftAPMode(server, dnsServer);
  server_mode = MODE_SOFT_AP;
  setWifiConnectState(WifiConnectState::Idle);
}

void setup()
{
  Serial.begin(115200);
  prefs.begin("wifi", true);
  savedSSID = prefs.getString("ssid", "");
  savedPASS = prefs.getString("pass", "");
  prefs.end();

  if (savedSSID.length() > 0) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(savedSSID.c_str(), savedPASS.c_str());
    if (WiFi.waitForConnectResult() == WL_CONNECTED) {
      startNormalMode(server);
      server_mode = MODE_NORMAL;
      return;
    }
  }

  startSoftAPMode(server, dnsServer);
  server_mode = MODE_SOFT_AP;
}

void loop() {
  // --- If running captive portal ---
  if (server_mode == MODE_SOFT_AP) {
    dnsServer.processNextRequest();

    WifiConnectState state = getWifiConnectState();

    if (state == WifiConnectState::Idle) {
      bool immediate = consumeImmediateConnectRequest();
      bool intervalElapsed = millis() - lastWiFiCheck > wifiCheckInterval;

      if (immediate || intervalElapsed) {
        lastWiFiCheck = millis();
        prefs.begin("wifi", true);
        savedSSID = prefs.getString("ssid", "");
        savedPASS = prefs.getString("pass", "");
        prefs.end();

        if (savedSSID.length() > 0) {
          Serial.printf("Attempting to connect to %s...\n", savedSSID.c_str());
          WiFi.mode(WIFI_AP_STA); // keep the AP up while attempting STA connection
          WiFi.begin(savedSSID.c_str(), savedPASS.c_str());
          setWifiStateChangedAt(millis());
          setWifiConnectState(WifiConnectState::Connecting);
        }
      }
    } else if (state == WifiConnectState::Connecting) {
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("Connected! Switching to normal mode shortly.");
        setWifiStateChangedAt(millis());
        setWifiConnectState(WifiConnectState::ConnectedGrace);
      } else if (millis() - getWifiStateChangedAt() > connectTimeoutMs) {
        Serial.println("Connection attempt timed out.");
        setWifiConnectState(WifiConnectState::Failed);
      }
    } else if (state == WifiConnectState::ConnectedGrace) {
      if (millis() - getWifiStateChangedAt() > connectedGraceMs) {
        switchToNormalMode();
      }
    } else if (state == WifiConnectState::Failed) {
      Serial.println("Will retry on the next check interval.");
      lastWiFiCheck = millis(); // ensure a full wifiCheckInterval passes before retrying
      setWifiConnectState(WifiConnectState::Idle);
    }
  } else if (server_mode == MODE_NORMAL) {
    if (millis() - lastWiFiCheck > wifiCheckInterval) {
      lastWiFiCheck = millis();
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Wi-Fi connection lost, switching to captive portal mode.\n");
        switchToCaptivePortal();
      }
    }
  }
}