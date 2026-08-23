#include "handlers/OutputHandlers.h"
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>

#include "utils/i2cUtils.h"
#include "outputs/Pca9685.h"

void handlePCA9685Put(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
{
  // Assemble the body. Buffered per-request (not a function-local static) since chunk callbacks
  // for different concurrent requests can interleave on the AsyncTCP task.
  if (index == 0)
  {
    request->_tempObject = new String();
    request->onDisconnect([request]() {
      delete static_cast<String *>(request->_tempObject);
      request->_tempObject = nullptr;
    });
  }
  String *body = static_cast<String *>(request->_tempObject);
  body->concat(reinterpret_cast<const char *>(data), len);

  // Only process once the full body is received
  if (index + len != total)
  {
    return;
  }

  // Parse the JSON and extract value
  JsonDocument doc;
  DeserializationError jsonErr = deserializeJson(doc, *body);
  delete body;
  request->_tempObject = nullptr;
  if (jsonErr)
  {
    request->send(400, "application/json", "{\"error\":\"invalid JSON\"}");
    return;
  }
  if (!doc["value"].is<int>())
  {
    request->send(400, "application/json", "{\"error\":\"missing required field: value\"}");
    return;
  }
  int value = doc["value"];

  // Extract address and pin from URL
  String url = request->url();

  String before = url.substring(0, url.lastIndexOf('/'));
  int prevSlash = before.lastIndexOf('/');
  String addressStr = before.substring(prevSlash + 1);
  if (addressStr == "pca9685")
  {
    request->send(400, "application/json", "{\"error\":\"Missing PCA9685 pin\"}");
    return;
  }

  // Get address
  uint8_t address = validateI2CHexAddress(addressStr, 0x40, 0x7F);
  if (address == 0)
  {
    request->send(400, "application/json", "{\"error\":\"Invalid PCA9685 address\"}");
    return;
  }

  // Get pin
  String pinStr = url.substring(url.lastIndexOf('/') + 1);
  if ((pinStr.length() == 2 && pinStr.charAt(0) != '1') ||
      (pinStr.length() == 2 && pinStr.charAt(0) == '1' && pinStr.charAt(1) > '5') ||
      (pinStr.length() == 1 && (pinStr.charAt(0) < '0' || pinStr.charAt(0) > '9')))
  {
    request->send(400, "application/json", "{\"error\":\"Invalid PCA9685 pin\"}");
    return;
  }
  uint8_t pin = (uint8_t)strtoul(pinStr.c_str(), nullptr, 0);

  // Validate inputs
  if (value < 0 || value > 100)
  {
    request->send(400, "application/json", "{\"error\":\"invalid pin or value\"}");
    return;
  }

  // Effect change
  String result_json = setPCA9685Pin(address, pin, value);

  if (result_json.indexOf("error") == -1)
  {
    request->send(200, "application/json", result_json);
  }
  else
  {
    request->send(400, "application/json", result_json);
  }
};

void handlePCA9685Get(AsyncWebServerRequest *request)
{
  // Extract address from URL
  String url = request->url();
  String addressStr = url.substring(url.lastIndexOf('/') + 1);

  // Get address
  uint8_t address = validateI2CHexAddress(addressStr, 0x40, 0x7F);
  if (address == 0)
  {
    request->send(400, "application/json", "{\"error\":\"Invalid PCA9685 address\"}");
    return;
  }

  String response = getPCA9685Status(address);
  request->send(200, "application/json", response);
}