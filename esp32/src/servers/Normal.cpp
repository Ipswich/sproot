#include "Normal.h"
#include <ESPAsyncWebServer.h>
#include <ESPmDNS.h>
#include <WiFi.h>

#include "sensors/Ds18b20.h"
#include "handlers/SensorHandlers.h"
#include "handlers/OutputHandlers.h"
#include "handlers/SystemHandlers.h"

void setupRoutes(AsyncWebServer& server);

void startNormalMode(AsyncWebServer& server)
{
  Serial.println("Starting Normal Mode...");
  uint64_t chipid = ESP.getEfuseMac();
  char hostname[32];
  uint16_t last16 = (chipid >> 32) & 0xFFFF;
  snprintf(hostname, sizeof(hostname), "sproot-esp32-%04X", last16); // Should give something like sensor-1A2B

  if (!MDNS.begin(hostname)) {
    Serial.println("Error starting mDNS");
    return;
  }
  MDNS.addService("sproot-device", "tcp", 80);

  ds18b20.begin();
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
    request->send(200, "text/plain", "pong"); 
  });
}

void stopNormalMode(AsyncWebServer& server) {
  MDNS.end();
  server.end();
}