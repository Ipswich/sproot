#include "Ds18b20.h"

#include <OneWire.h>
#include <DallasTemperature.h>

// ===== Hardware Config =====
#define ONE_WIRE_BUS 4 // DS18B20 Pin
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

/**
 * @brief Reads data from the DS18B20 sensor at the given address and returns a JSON string with the reading.
 */
String readDS18B20ByAddress(const String& address) {
  DeviceAddress addr;

  if (address.length() != 16) {
    return "{\"error\":\"Invalid address length\"}";
  }
  
  for (uint8_t i = 0; i < 8; i++) {
    String byteString = address.substring(i * 2, i * 2 + 2);
    addr[i] = (uint8_t) strtoul(byteString.c_str(), nullptr, 16);
  }

  if (!ds18b20.isConnected(addr)) {
    return "{\"error\":\"Sensor not connected at given address\"}";
  }

  ds18b20.requestTemperatures();
  float temperature = ds18b20.getTempC(addr);

  String readingJsonString = "{";
  readingJsonString += "\"address\":\"" + address + "\",";
  readingJsonString += "\"temperature\":" + String(temperature, 2);
  readingJsonString += "}";

  return readingJsonString;
}

String getDS1820AddressesJson() {
  String addressesJsonString = "{ \"addresses\": [";

  int count = ds18b20.getDeviceCount();
  DeviceAddress addr;

  for (int i = 0; i < count; i++) {
    if (ds18b20.getAddress(addr, i)) {
      if (i > 0) addressesJsonString += ",";
      addressesJsonString += "\"";
      for (uint8_t j = 0; j < 8; j++) {
        if (addr[j] < 16) addressesJsonString += "0";
        addressesJsonString += String(addr[j], HEX);
      }
      addressesJsonString += "\"";
    }
  }

  addressesJsonString += "] }";
  return addressesJsonString;
}


