#pragma once

#include <DNSServer.h>
#include <ESPAsyncWebServer.h>

void startSoftAPMode(AsyncWebServer& serverm, DNSServer& dnsServer);
void stopSoftAPMode(AsyncWebServer& serverm, DNSServer& dnsServer);
