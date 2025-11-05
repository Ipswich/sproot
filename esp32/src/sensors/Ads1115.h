#pragma once

#include <map>
#include <Adafruit_ADS1X15.h>

extern std::map<uint8_t, Adafruit_ADS1115*> ads1115Registry;

Adafruit_ADS1115* getADS1115(uint8_t address);

String readADS1115(uint8_t address, uint8_t pin, adsGain_t gain);