#include "Ads1115.h"

#include <map>
#include <Adafruit_ADS1X15.h>
#include "Wire.h"

// ===== Hardware Config =====
std::map<uint8_t, Adafruit_ADS1115*> ads1115Registry;

/**
 * @brief Retrieves or initializes an Adafruit_ADS1115 instance for the given I2C address.
 * 
 * This function checks if an Adafruit_ADS1115 instance already exists for the specified
 * I2C address in the adsRegistry. If it does, it returns the existing instance. If not,
 * it creates a new instance, initializes it, and stores it in the registry before returning it.
 * 
 * @param address The I2C address of the ADS1115 device.
 * @return A pointer to the Adafruit_ADS1115 instance, or nullptr if initialization failed.
 */
Adafruit_ADS1115* getADS1115(uint8_t address) {
    if (ads1115Registry.count(address)) {
      if(Wire.endTransmission() == 0) {
        return ads1115Registry[address];
      }
      delete ads1115Registry[address];
      ads1115Registry.erase(address);
    }

    Adafruit_ADS1115* ads = new Adafruit_ADS1115();
    if (!ads->begin()) {
        delete ads;
        return nullptr;
    }

    ads1115Registry[address] = ads;
    return ads;
}

/**
 * @brief Reads data from ADS1115 sensor at the provided address and returns a JSON string with the readings.
 * @param address I2C address of the ADS1115 sensor.
 * @param gain Gain setting for the ADS1115 sensor.
 * @return JSON string containing voltage readings from all four channels.
 */
String readADS1115(uint8_t address, uint8_t pin, adsGain_t gain)
{
  String readingJsonString = "{ \"readings\": ";

  Adafruit_ADS1X15* ads1115 = getADS1115(address);

  if (ads1115 != nullptr) {
    ads1115->setGain(gain);
    int16_t reading = ads1115->readADC_SingleEnded(pin);
    float voltage = ads1115->computeVolts(reading);

    readingJsonString += "{ \"raw\":" + String(reading) + ", ";
    readingJsonString += "\"voltage\":" + String(voltage, 4) + " } ";
  }
  readingJsonString += " }";
  return readingJsonString;
}