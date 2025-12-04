#include "otaUpdates/otaUpdates.h"
#include "otaUpdates.h"
#include <Preferences.h>

int otaUpdateResult = 0; // 0: idle, 1: in progress, 2: success, -1: failure
String otaUpdateResultMessage;
struct OTAParams
{
  String firmwareUrl;
  String expectedSha;
  String firmwareVersion;
  TaskHandle_t callerHandle;
};

struct FetchManifestResponseContent
{
  Manifest data;
};

struct FetchManifestResponse
{
  int statusCode;
  FetchManifestResponseContent content;
  String timestamp;
  String requestId;
};

bool isNewerVersion(const char *latest, const char *current)
{
  if (!latest || !current)
  {
    return false;
  }

  auto parseVersion = [](const char *versionString, int &maj, int &min, int &patch)
  {
    maj = min = patch = 0;
    if (!versionString)
    {
      return;
    }
    while (*versionString && isspace((unsigned char)*versionString))
    {
      ++versionString;
    }
    if (*versionString == 'v' || *versionString == 'V')
    {
      ++versionString;
    }
    char *end;
    long val = strtol(versionString, &end, 10);
    if (end != versionString)
    {
      maj = (int)val;
    }
    versionString = end;
    if (*versionString == '.')
    {
      ++versionString;
    }
    val = strtol(versionString, &end, 10);
    if (end != versionString)
    {
      min = (int)val;
    }
    versionString = end;
    if (*versionString == '.')
    {
      ++versionString;
    }
    val = strtol(versionString, &end, 10);
    if (end != versionString)
    {
      patch = (int)val;
    }
  };

  int lmaj, lmin, lpatch;
  int cmaj, cmin, cpatch;
  parseVersion(latest, lmaj, lmin, lpatch);
  parseVersion(current, cmaj, cmin, cpatch);

  if (lmaj != cmaj)
  {
    return lmaj > cmaj;
  }
  if (lmin != cmin)
  {
    return lmin > cmin;
  }
  return lpatch > cpatch;
}

Manifest fetchManifest(const char *manifestUrl)
{
  Manifest manifest;
  HTTPClient client;
  client.begin(manifestUrl);
  int code = client.GET();

  if (code == 200)
  {
    String payload = client.getString();
    JsonDocument doc;
    if (deserializeJson(doc, payload) == DeserializationError::Ok)
    {
      manifest.version = doc["content"]["data"]["version"].as<String>();
      manifest.sha256 = doc["content"]["data"]["sha256"].as<String>();
      manifest.path = doc["content"]["data"]["path"].as<String>();
    }
    else
    {
      Serial.println("Failed to parse manifest JSON");
    }
  }
  else
  {
    Serial.printf("Failed to fetch manifest, code: %d\n", code);
  }

  client.end();
  return manifest;
}

void setOTAUpdateResult(int resultCode, const String &resultMessage)
{
  otaUpdateResult = resultCode;
  otaUpdateResultMessage = resultMessage;
}

int getOTAUpdateResult()
{
  return otaUpdateResult;
}

String getOTAUpdateResultMessage()
{
  return otaUpdateResultMessage;
}

void otaTask(void *param)
{
  Serial.println("Starting Update Task");
  Preferences prefs;
  setOTAUpdateResult(1, "OTA update in progress");
  OTAParams *p = static_cast<OTAParams *>(param);
  String firmwareUrl = p->firmwareUrl;
  String expectedSha = p->expectedSha;
  String firmwareVersion = p->firmwareVersion;
  TaskHandle_t callerHandle = p->callerHandle;
  delete p;

  HTTPClient http;
  http.setTimeout(5000);
  http.begin(firmwareUrl);
  int httpCode = http.GET();

  if (httpCode != HTTP_CODE_OK)
  {
    Serial.println("Failed firmware download");
    setOTAUpdateResult(-1, "Failed to download firmware, HTTP code: " + String(httpCode));
    http.end();
    xTaskNotifyGive(callerHandle);
    vTaskDelete(NULL);
    return;
  }

  WiFiClient *stream = http.getStreamPtr();
  int contentLength = http.getSize(); // use signed int to detect -1/unknown
  bool unknownSize = (contentLength <= 0);

  if (!Update.begin(unknownSize ? UPDATE_SIZE_UNKNOWN : (size_t)contentLength))
  {
    Serial.println("Not enough space");
    setOTAUpdateResult(-1, "Not enough space to begin OTA");
    http.end();
    xTaskNotifyGive(callerHandle);
    vTaskDelete(NULL);
    return;
  }

  // SHA256 calculation on the fly while flashing
  mbedtls_sha256_context shaCtx;
  mbedtls_sha256_init(&shaCtx);
  mbedtls_sha256_starts(&shaCtx, 0);

  uint8_t buf[512];
  size_t written = 0;

  // continue while connection open or there's data available.
  while ((http.connected() || stream->available()) && (unknownSize || written < (size_t)contentLength))
  {
    size_t available = stream->available();
    if (available)
    {
      size_t toRead = min(sizeof(buf), available);
      size_t len = stream->readBytes(buf, toRead);
      if (len == 0)
      {
        // nothing read this iteration
        delay(1);
        continue;
      }

      size_t w = Update.write(buf, len);
      if (w != len)
      {
        Serial.printf("Update.write failed: wrote %u of %u\n", (unsigned)w, (unsigned)len);
        setOTAUpdateResult(-1, "OTA write failed");
        Update.abort();
        http.end();
        xTaskNotifyGive(callerHandle);
        vTaskDelete(NULL);
        return;
      }

      mbedtls_sha256_update(&shaCtx, buf, len);
      written += len;
      Serial.printf("\rFlashed %d/%d bytes", (int)written, contentLength);
    }
    else
    {
      delay(1);
    }
  }

  // If we knew the content length, ensure we received all bytes
  if (!unknownSize && written != (size_t)contentLength)
  {
    Serial.printf("\nDownloaded size mismatch: got %u expected %d\n", (unsigned)written, contentLength);
    setOTAUpdateResult(-1, "Incomplete download: size mismatch");
    Update.abort();
    http.end();
    xTaskNotifyGive(callerHandle);
    vTaskDelete(NULL);
    return;
  }

  // finish hash into a dedicated 32-byte buffer
  uint8_t hashBuf[32];
  mbedtls_sha256_finish(&shaCtx, hashBuf);
  mbedtls_sha256_free(&shaCtx);

  // Convert hash to hex
  char hashHex[65];
  for (int i = 0; i < 32; i++)
    sprintf(hashHex + i * 2, "%02x", hashBuf[i]);
  hashHex[64] = 0;

  Serial.println("\n" + expectedSha);
  Serial.println(String(hashHex));

  if (!expectedSha.equalsIgnoreCase(String(hashHex)))
  {
    Serial.println("SHA Mismatch!");
    setOTAUpdateResult(-1, "SHA256 mismatch! Aborting OTA.");
    Update.abort();
    http.end();
    xTaskNotifyGive(callerHandle);
    vTaskDelete(NULL);
    return;
  }

  if (!Update.end())
  {
    Serial.println("Update failed!");
    setOTAUpdateResult(-1, "OTA update failed. Error: " + String(Update.getError()));
    http.end();
    xTaskNotifyGive(callerHandle);
    vTaskDelete(NULL);
    return;
  }

  Serial.println("Success!");
  setOTAUpdateResult(2, "OTA successful!");
  http.end();

  // Restart
  ESP.restart();
  xTaskNotifyGive(callerHandle);
  vTaskDelete(NULL);
  return;
}

String performOTAUpdate(String firmwareUrl, const String &expectedSha, const String firmwareVersion)
{
  setOTAUpdateResult(0, "");

  TaskHandle_t caller = xTaskGetCurrentTaskHandle();
  xTaskNotifyStateClear(caller);
  OTAParams *params = new OTAParams{firmwareUrl, expectedSha, firmwareVersion, caller};

  xTaskCreatePinnedToCore(
      otaTask,
      "OTAUpdate",
      8192,
      params,
      1,
      NULL,
      1);

  ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

  int result = getOTAUpdateResult();
  String message = getOTAUpdateResultMessage();

  return "{ \"status\": \"started\" }";
  // if (result == 2)
  // {
  //   return
  // }
  // else
  // {
  //   return "{\"error\": \"" + message + "\", \"code\": " + String(result) + "}";
  // }
}
