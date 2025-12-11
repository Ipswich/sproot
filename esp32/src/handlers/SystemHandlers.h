#pragma once

#include <ESPAsyncWebServer.h>

void handlePairPost(AsyncWebServerRequest *request);
void handleResetPost(AsyncWebServerRequest *request);
void handleTriggerOTAUpdatePost(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);