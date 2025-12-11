#pragma once

#include <Arduino.h>

uint8_t validateI2CHexAddress(const String &address_str, uint8_t min, uint8_t max);
