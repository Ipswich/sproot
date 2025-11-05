#pragma once

#include <ESPAsyncWebServer.h>

void handleDs18b20Get(AsyncWebServerRequest *request);
void handleDs18b20AddressesGet(AsyncWebServerRequest *request);
void handleBme280Get(AsyncWebServerRequest *request);
void handleADS1115Get(AsyncWebServerRequest *request);