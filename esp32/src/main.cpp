#include <DNSServer.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <WiFi.h>

#include "servers/Normal.h"
#include "servers/SoftAP.h"

constexpr const char* BME280_ADDR_REGEX = "0x([0-6][0-9A-Fa-f]|7[0-7])";

AsyncWebServer server(80);
Preferences prefs;
DNSServer dnsServer;

enum ServerMode {
  MODE_UNDEFINED = 0,
  MODE_NORMAL = 1,
  MODE_SOFT_AP = 2
};
int server_mode = MODE_UNDEFINED;

void setup()
{
  Serial.begin(115200);
  prefs.begin("wifi", true);
  String ssid = prefs.getString("ssid", "");
  String pass = prefs.getString("pass", "");
  prefs.end();

  if (ssid.length() > 0) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());
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
  if (server_mode == MODE_SOFT_AP) {
    dnsServer.processNextRequest();
  }
}