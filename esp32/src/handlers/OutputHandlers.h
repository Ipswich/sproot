#pragma once

#include <ESPAsyncWebServer.h>

void handlePCA9685Put(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);
void handlePCA9685Get(AsyncWebServerRequest *request);