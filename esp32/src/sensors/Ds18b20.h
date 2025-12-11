#pragma once

#include <OneWire.h>
#include <DallasTemperature.h>

#ifndef ONE_WIRE_BUS
#define ONE_WIRE_BUS 4
#endif

extern OneWire oneWire;
extern DallasTemperature ds18b20;

String readDS18B20ByAddress(const String& address);
String getDS1820AddressesJson();