#include "DeviceIdentity.h"

String getDeviceHostname()
{
  uint64_t chipid = ESP.getEfuseMac();
  char hostname[32];
  uint16_t last16 = (chipid >> 32) & 0xFFFF;
  snprintf(hostname, sizeof(hostname), "sproot-esp32-%04X", last16);
  return String(hostname);
}
