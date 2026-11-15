# PARKING TRACE ESP32-S3 Firmware

ESP-IDF firmware for the vehicle-mounted PARKING TRACE unit.

## Current implementation

The first NimBLE milestone is implemented in source:

- Advertises a BLE peripheral using the PARKING TRACE custom 128-bit service UUID.
- Uses a stable board-specific identifier in the form `PT-XXXXXX`, derived from the Bluetooth MAC address suffix.
- Exposes read-only Device ID, Protocol Version, and Device Status characteristics.
- Restarts advertising after a client disconnects.

The current Device Status value is the static text `READY`. Sensor telemetry, authentication, and secure device claiming are not implemented yet.

## Target hardware

- ESP32-S3 development board
- GNSS UART module
- BMP390 I2C pressure sensor
- MPU6050 I2C IMU

## Toolchain

- ESP-IDF 5.x
- NimBLE (provided by ESP-IDF Bluetooth component)
- Target: `esp32s3`

## Build

Open this `firmware` directory in VS Code with the Espressif ESP-IDF extension, select target `esp32s3`, then run Build.

Equivalent terminal commands:

```bash
idf.py set-target esp32s3
idf.py build
```

If the project was previously configured for another target, remove the old build configuration using the ESP-IDF extension's full-clean command before rebuilding.

## BLE characteristics

| Characteristic | Access | Current value |
|---|---|---|
| Device ID | Read | PT-XXXXXX |
| Protocol Version | Read | 1.0 |
| Device Status | Read | READY |

The UUIDs must remain synchronized with `docs/DEVICE_PROTOCOL_V1.md`.

## Important limitations

- Device ID is an identifier, not an authentication secret.
- The MAC-derived ID is suitable for development identification, not proof of ownership.
- Do not treat a matching Device ID as authorization to control or trust a device.
- Secure claim/pairing and challenge-response authentication must be implemented before production use.
- BLE code has not yet been compiled or tested on physical hardware in this development session.
- No vehicle-control interfaces are implemented; the device is sensing-only.
