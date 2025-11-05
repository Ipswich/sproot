#pragma once

#include <map>
#include <Adafruit_BME280.h>

extern std::map<uint8_t, Adafruit_BME280*> bme280Registry;

Adafruit_BME280* getBME280(uint8_t address);

String readBME280s(uint8_t address);