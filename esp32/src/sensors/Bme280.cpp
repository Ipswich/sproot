#include "Bme280.h"

#include <map>
#include <Adafruit_BME280.h>
#include "Wire.h"

// ===== Hardware Config =====
std::map<uint8_t, Adafruit_BME280*> bme280Registry;

/**
 * @brief Retrieves or initializes an Adafruit_BME280 instance for the given I2C address.
 * 
 * This function checks if an Adafruit_BME280 instance already exists for the specified
 * I2C address in the bmeRegistry. If it does, it returns the existing instance. If not,
 * it creates a new instance, initializes it, and stores it in the registry before returning it.
 * 
 * @param address The I2C address of the BME280 device.
 * @return A pointer to the Adafruit_BME280 instance, or nullptr if initialization failed.
 */
Adafruit_BME280* getBME280(uint8_t address) {
    if (bme280Registry.count(address)) {
      if(Wire.endTransmission() == 0) {
        return bme280Registry[address];
      } 
      delete bme280Registry[address];
      bme280Registry.erase(address);
    }

    Adafruit_BME280* bme = new Adafruit_BME280();
    if (!bme->begin(address)) {
        delete bme;
        return nullptr;
    }

    bme280Registry[address] = bme;
    return bme;
}

/**
 * @brief Reads data from BME280 sensor at the provided address and returns a JSON string with the readings.
 * @param address I2C address of the BME280 sensor.
 * @return JSON string containing temperature, humidity, and pressure readings.
 */
String readBME280s(uint8_t address)
{
  String readingJsonString = "{ \"readings\": ";

  Adafruit_BME280* bme280 = getBME280(address);
  if(bme280 != nullptr) {
      float temperature = bme280->readTemperature();
      float humidity = bme280->readHumidity();
      float pressure = bme280->readPressure() / 100.0F;
      readingJsonString += "{ \"temperature\":" + String(temperature, 2) + ", ";
      readingJsonString += "\"humidity\":" + String(humidity, 2) + ", ";
      readingJsonString += "\"pressure\":" + String(pressure, 2) + " } ";
  }

  readingJsonString += " }";
  return readingJsonString;
}