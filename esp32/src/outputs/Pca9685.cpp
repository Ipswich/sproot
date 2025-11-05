#include "Pca9685.h"

#include <map>
#include <Adafruit_PWMServoDriver.h>
#include "Wire.h"

// ===== Hardware Config =====
std::map<uint8_t, Adafruit_PWMServoDriver*> pca9685Registry;

/// @brief Retrieves or initializes an Adafruit_PWMServoDriver instance for the given I2C address.
/// @param address The I2C address of the PCA9685 device.
/// @return A pointer to the Adafruit_PWMServoDriver instance, or nullptr if initialization failed
Adafruit_PWMServoDriver* getPCA9685(uint8_t address){
    if (pca9685Registry.count(address)) {
      if(Wire.endTransmission() == 0) {
        return pca9685Registry[address];
      }
      delete pca9685Registry[address];
      pca9685Registry.erase(address);
    }

    Adafruit_PWMServoDriver* pca9685 = new Adafruit_PWMServoDriver(address);
    if (!pca9685->begin()) {
        delete pca9685;
        return nullptr;
    }

    pca9685->setPWMFreq(800);
    pca9685Registry[address] = pca9685;
    return pca9685;
}

/// @brief Sets the PWM value for a specific pin on the PCA9685 at the given I2C address.
/// @param address I2C address of the PCA9685 device.
/// @param pin Pin number (0-15) to set the PWM value for.
/// @param percentage_on PWM value as a percentage (0-100).
/// @return JSON string indicating success or failure of the operation.
String setPCA9685Pin(uint8_t address, uint8_t pin, uint16_t percentage_on){
    Adafruit_PWMServoDriver* pca9685 = getPCA9685(address);

    if(pin < 0 || pin > 15) {
        return "{ \"status\":\"error\", \"message\":\"Invalid pin number. Must be between 0 and 15.\" }";
    }
    if (percentage_on < 0 || percentage_on > 100) {
        return "{ \"status\":\"error\", \"message\":\"Invalid percentage_on value. Must be between 0 and 100.\" }";
    }
    uint16_t on_value = map(percentage_on, 0, 100, 0, 4095);
    
    String response_json = "{ ";
    if(pca9685 != nullptr) {
        pca9685->setPin(pin, on_value);
        response_json += "\"status\":\"ok\", ";
        response_json += "\"address\":\"0x" + String(address, HEX) + "\", ";
        response_json += "\"pin\":" + String(pin) + ", ";
        response_json += "\"percentage_on\":" + String(percentage_on);
    } else {
        response_json += "\"status\":\"error\", ";
        response_json += "\"message\":\"Failed to set PWM on PCA9685 at address 0x" + String(address, HEX) + ", pin " + String(pin) +"\"";
    }

    response_json += " }";
    return response_json;
}

String getPCA9685Status(uint8_t address) {
    Adafruit_PWMServoDriver* pca9685 = getPCA9685(address);
    String response_json = "{ ";
    if(pca9685 != nullptr) {
        response_json += "\"status\":\"ok\", ";
        response_json += "\"address\":\"0x" + String(address, HEX) + "\", ";
        response_json += "\"pins\":{ ";
        for(uint8_t pin = 0; pin < 16; pin++) {
            uint16_t pwm_value = pca9685->getPWM(pin, true);
            uint16_t percentage_on = map(pwm_value, 0, 4095, 0, 100);
            response_json += "\"" + String(pin) + "\":" + String(percentage_on);
            if(pin < 15) {
                response_json += ", ";
            }
        }
        response_json += " }";
    } else {
        response_json += "\"status\":\"error\", ";
        response_json += "\"message\":\"Failed to retrieve PCA9685 at address 0x" + String(address, HEX) + "\"";
    }
    response_json += " }";
    return response_json;
}