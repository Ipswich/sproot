#include "i2cUtils.h"

uint8_t validateI2CHexAddress(const String &address_str, uint8_t min, uint8_t max)
{
  if (address_str.length() > 4)
  {
    return 0;
  }
  uint8_t address = (uint8_t)strtoul(address_str.c_str(), nullptr, 16);

  return (address >= min && address <= max) ? address : 0;
}