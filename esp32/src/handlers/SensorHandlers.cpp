#include "handlers/SensorHandlers.h"
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

#include "utils/i2cUtils.h"
#include "sensors/Ds18b20.h"
#include "sensors/Bme280.h"
#include "sensors/Ads1115.h"

void handleDs18b20Get(AsyncWebServerRequest *request)
{
  String url = request->url();
  int lastSlash = url.lastIndexOf('/');

  String address = request->urlDecode(url.substring(lastSlash + 1));
  const char *s = address.c_str();
  if (address.length() != 16 || !address.startsWith("28") ||
      strspn(s + 2, "0123456789abcdefABCDEF") != 14)
  {
    request->send(400, "application/json", "{\"error\":\"Invalid DS18B20 address\"}");
    return;
  }

  String response_json = readDS18B20ByAddress(address);
  if (response_json.indexOf("error") == -1)
  {
    request->send(200, "application/json", response_json);
  }
  else
  {
    request->send(404, "application/json", response_json);
  }
}

void handleDs18b20AddressesGet(AsyncWebServerRequest *request)
{
  String response_json = getDS1820AddressesJson();
  request->send(200, "application/json", response_json);
}

void handleBme280Get(AsyncWebServerRequest *request)
{
  const String deviceName = "BME280";
  String url = request->url();
  int lastSlash = url.lastIndexOf('/');
  String address_str = request->urlDecode(url.substring(lastSlash + 1));

  // Get address
  uint8_t address = validateI2CHexAddress(address_str, 0x76, 0x77);
  if (address == 0)
  {
    String error_json = String("{\"error\":\"Invalid ") + deviceName + " address format\"}";
    request->send(400, "application/json", error_json);
  }

  Adafruit_BME280 *bme280 = getBME280(address);
  if (bme280 == nullptr)
  {
    request->send(404, "application/json", "{\"error\":\"BME280 not found at address " + address_str + "\"}");
    return;
  }
  String response_json = readBME280s(address);
  if (response_json.indexOf("error") == -1)
  {
    request->send(200, "application/json", response_json);
  }
  else
  {
    request->send(404, "application/json", response_json);
  }
}

void handleADS1115Get(AsyncWebServerRequest *request)
{
  adsGain_t gain = GAIN_ONE; // Default gain

  // Extract address and pin from URL
  String url = request->url();

  // Get address
  String before = url.substring(0, url.lastIndexOf('/'));
  int prevSlash = before.lastIndexOf('/');
  String addressStr = before.substring(prevSlash + 1);
  String pinStr = url.substring(url.lastIndexOf('/') + 1);
  if (addressStr == "ads1115")
  {
    request->send(400, "application/json", "{\"error\":\"Missing ADS1115 pin\"}");
    return;
  }
  
  // Get address
  uint8_t address = validateI2CHexAddress(addressStr, 0x48, 0x4B);
  if (address == 0)
  {
    request->send(400, "application/json", "{\"error\":\"Invalid ADS1115 address\"}");
    return;
  }

  // Get pin
  if (pinStr.length() > 1 || pinStr.charAt(0) < '0' || pinStr.charAt(0) > '3')
  {
    request->send(400, "application/json", "{\"error\":\"Invalid ADS1115 pin\"}");
    return;
  }
  uint8_t pin = (uint8_t)strtoul(pinStr.c_str(), nullptr, 0);


  Adafruit_ADS1X15 *ads1115 = getADS1115(address);
  if (ads1115 == nullptr)
  {
    request->send(404, "application/json", "{\"error\":\"ADS1115 not found at address " + addressStr + "\"}");
    return;
  }

  if (request->hasParam("gain"))
  {
    String gainStr = request->urlDecode(request->getParam("gain")->value());
    if (gainStr == "2/3")
    {
      gain = GAIN_TWOTHIRDS;
    }
    else if (gainStr == "1")
    {
      gain = GAIN_ONE;
    }
    else if (gainStr == "2")
    {
      gain = GAIN_TWO;
    }
    else if (gainStr == "4")
    {
      gain = GAIN_FOUR;
    }
    else if (gainStr == "8")
    {
      gain = GAIN_EIGHT;
    }
    else if (gainStr == "16")
    {
      gain = GAIN_SIXTEEN;
    }
    else
    {
      request->send(400, "application/json", "{\"error\":\"Invalid ADS1115 gain parameter\"}");
      return;
    }
  }

  String response_json = readADS1115(address, pin, gain);
  if (response_json.indexOf("error") == -1)
  {
    request->send(200, "application/json", response_json);
  }
  else
  {
    request->send(404, "application/json", response_json);
  }
}