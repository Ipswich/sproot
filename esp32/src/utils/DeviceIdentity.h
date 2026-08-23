#pragma once

#include <Arduino.h>

// Returns this device's mDNS hostname (without the ".local" suffix),
// derived from the chip's eFuse MAC. Must stay in sync with whatever
// name is passed to MDNS.begin() in Normal.cpp.
String getDeviceHostname();
