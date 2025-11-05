#pragma once

#include <map>
#include <Adafruit_PWMServoDriver.h>

extern std::map<uint8_t, Adafruit_PWMServoDriver*> pca9685Registry;

Adafruit_PWMServoDriver* getPCA9685(uint8_t address);
String setPCA9685Pin(uint8_t address, uint8_t channel, uint16_t value);
String getPCA9685Status(uint8_t address);
