#include <DNSServer.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <WiFi.h>

#include "servers/Normal.h"
#include "servers/SoftAP.h"

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
    
    // Periodically re-check if Wi-Fi network is available
    if (millis() - lastWiFiCheck > wifiCheckInterval) {
      Serial.println("Updating in range Wi-Fi networks. . .");
      lastWiFiCheck = millis();
      prefs.begin("wifi", true);
      savedSSID = prefs.getString("ssid", "");
      savedPASS = prefs.getString("pass", "");
      prefs.end();

      if (savedSSID.length() > 0) {
        WiFi.mode(WIFI_AP_STA); // allow scanning while keeping the AP
        int n = WiFi.scanNetworks(false, true);
        if (n < 0) {
          Serial.printf("WiFi scan error: %d\n", n); // handle or retry later
        } else {
          Serial.printf("Looking for network: %s. %i networks detected.\n", savedSSID.c_str(), n);
          for (int i = 0; i < n; i++) {
            String networkName = WiFi.SSID(i);
            if (networkName == savedSSID) {
              Serial.printf("%s found in range, attempting connection.\n", networkName.c_str());
              WiFi.begin(savedSSID.c_str(), savedPASS.c_str());
              if (WiFi.waitForConnectResult() == WL_CONNECTED) {
                Serial.println("Success! Switching to normal mode.\n");
                switchToNormalMode();
              } else {
                Serial.println("Failed! Connection will be reattempted in 10 seconds.\n");
              }
              break;
            }
          }
        }
      }
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