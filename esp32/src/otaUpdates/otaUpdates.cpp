#include "otaUpdates/otaUpdates.h"
#include "otaUpdates.h"

struct FetchManifestResponseContent {
  Manifest data;
};

struct FetchManifestResponse {
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

String performOTAUpdate(const String firmwareUrl, const String &expectedSha)
{
  HTTPClient http;
  http.begin(firmwareUrl);
  int httpCode = http.GET();

  if (httpCode != HTTP_CODE_OK)
  {
    Serial.printf("Failed to download firmware, HTTP code: %d\n", httpCode);
    http.end();
    return "{ \"error\": \"Failed to download firmware\", \"code\": " + String(httpCode) + " }";
  }

  WiFiClient *stream = http.getStreamPtr();
  size_t contentLength = http.getSize();

  if (!Update.begin(contentLength))
  {
    Serial.println("Not enough space to begin OTA");
    http.end();
    return "{ \"error\": \"Not enough space for OTA\" }";
  }

  // SHA256 calculation on the fly while flashing
  mbedtls_sha256_context shaCtx;
  mbedtls_sha256_init(&shaCtx);
  mbedtls_sha256_starts(&shaCtx, 0);

  uint8_t buf[512];
  size_t written = 0;

  while (http.connected() && written < contentLength)
  {
    size_t available = stream->available();
    if (available)
    {
      size_t len = stream->readBytes(buf, min(sizeof(buf), available));
      Update.write(buf, len);
      mbedtls_sha256_update(&shaCtx, buf, len);
      written += len;
      Serial.printf("\rFlashed %d/%d bytes", written, contentLength);
    }
    delay(1);
  }

  mbedtls_sha256_finish(&shaCtx, buf); // reuse buf to store final hash

  // Convert hash to hex
  char hashHex[65];
  for (int i = 0; i < 32; i++)
    sprintf(hashHex + i * 2, "%02x", buf[i]);
  hashHex[64] = 0;

  if (!expectedSha.equalsIgnoreCase(String(hashHex)))
  {
    Serial.println("\nSHA256 mismatch! Aborting OTA.");
    Update.abort();
    http.end();
    return "{ \"error\": \"SHA256 mismatch\" }";
  }

  if (!Update.end())
  {
    Serial.printf("\nOTA failed! Error #: %d\n", Update.getError());
    http.end();
    return "{ \"error\": \"OTA update failed\", \"code\": " + String(Update.getError()) + ", \"message\": \"" + String(Update.errorString()) + "\" }";
  }

  Serial.println("\nOTA successful! Rebooting...");
  http.end();
  return "{ \"status\": \"success\" }";
}
