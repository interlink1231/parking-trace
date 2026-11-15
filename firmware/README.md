# PARKING TRACE ESP32-S3 Firmware

ESP-IDF firmware workspace for the vehicle-mounted PARKING TRACE unit.

## Current scope

This initial scaffold establishes the firmware project boundary and shared BLE identifiers. It is not yet a working BLE implementation.

### Target hardware
- ESP32-S3 development board
- GNSS UART module
- BMP390 I2C pressure sensor
- MPU6050 I2C IMU

### Toolchain
- ESP-IDF 5.x
- CMake / Ninja
- Target: `esp32s3`

## Planned firmware milestones

1. BLE service advertising and read-only identity characteristics
2. Device status characteristic
3. Secure claim/pairing protocol (must be finalized before enabling trusted access)
4. Simulated telemetry notifications
5. GNSS, BMP390, and MPU6050 drivers
6. Parking-state estimation and telemetry integration

## Build

After installing and exporting ESP-IDF 5.x:

```bash
cd firmware
idf.py set-target esp32s3
idf.py menuconfig
idf.py build
```

BLE host selection and controller settings must be enabled in ESP-IDF configuration. The BLE implementation will be added in the next firmware milestone after the project pins its ESP-IDF version and NimBLE configuration.

## Important

- Device ID is an identifier, never an authentication secret.
- Do not ship firmware that trusts a matching ID alone.
- Do not store production secrets in source control.
- No vehicle-control interfaces are implemented; the device is sensing-only.
- Verify the exact ESP32-S3 board pinout and each sensor breakout's voltage requirements before wiring.
