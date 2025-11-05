#pragma once

#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>
#include <mbedtls/sha256.h>

struct Manifest
{
  String version;
  String sha256;
  String path;
};

String performOTAUpdate(const String firmwareUrl, const String &expectedSha);
bool isNewerVersion(const char *latest, const char *current);
Manifest fetchManifest(const char *manifestUrl);

