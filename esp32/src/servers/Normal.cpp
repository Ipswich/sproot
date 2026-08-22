#include "Normal.h"
#include <ESPAsyncWebServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <WiFi.h>

#include "sensors/Ds18b20.h"
#include "handlers/SensorHandlers.h"
#include "handlers/OutputHandlers.h"
#include "handlers/SystemHandlers.h"
#include "utils/DeviceIdentity.h"
#include "Version.h"

void setupRoutes(AsyncWebServer& server);

void startNormalMode(AsyncWebServer& server)
{
  Serial.println("Starting Normal Mode...");
  String hostname = getDeviceHostname();

  if (!MDNS.begin(hostname.c_str())) {
    Serial.println("Error starting mDNS");
    return;
  }
  MDNS.addService("sproot-device", "tcp", 80);

  ds18b20.begin();

  // Routes (and the not-found handler below) are re-registered every time this mode starts,
  // including when bouncing back from Soft AP mode after a Wi-Fi drop. AsyncWebServer::on()
  // always appends to its internal handler list and never frees old entries on end(), so without
  // this reset each mode switch would permanently leak handlers until the device runs out of
  // heap and stops responding to requests entirely.
  server.reset();
  setupRoutes(server);

  server.onNotFound([](AsyncWebServerRequest *request)
  {
    String queryParams;
    for (size_t i = 0; i < request->params(); ++i) {
      const AsyncWebParameter* p = request->getParam(i);
      if (i) queryParams += '&';
      queryParams += p->name();
      queryParams += '=';
      queryParams += p->value();
    }
    String fullUrl = String(request->url());
    if (queryParams.length()) {
      fullUrl += '?';
      fullUrl += queryParams;
    }
    Serial.println(String("404 Not Found: ") + fullUrl);

    Serial.println("Method: " + String(request->method()));
    request->send(404, "application/json", "{\"error\":\"Not found\"}");
  });

  server.begin();
}

void setupRoutes(AsyncWebServer& server) 
{
  // ===== Sensor API Endpoints =====
  server.on("/api/sensors/ds18b20/addresses", HTTP_GET, handleDs18b20AddressesGet);
  server.on("/api/sensors/ds18b20/*", HTTP_GET, handleDs18b20Get);

  server.on("/api/sensors/bme280/*", HTTP_GET, handleBme280Get);

  server.on("/api/sensors/ads1115/*", HTTP_GET, handleADS1115Get);

  // ===== Output API Endpoints =====
  server.on("/api/outputs/pca9685/*", HTTP_PUT, [](AsyncWebServerRequest *request){}, NULL, handlePCA9685Put);

  // ===== System API Endpoints =====
  server.on("/api/system/update", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL, handleTriggerOTAUpdatePost);

  // ===== General API Endpoints =====
  server.on("/ping", HTTP_GET, [](AsyncWebServerRequest *request)
  {
    request->send(200, "application/json", "{ \"status\": \"pong\", \"version\": \"" + String(VERSION) + "\" }"); 
  });
}

void stopNormalMode(AsyncWebServer& server) {
  MDNS.end();
  server.end();
}