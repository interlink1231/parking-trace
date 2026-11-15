# PARKING TRACE ESP32-S3 Firmware

ESP-IDF firmware for the vehicle-mounted PARKING TRACE unit.

## Current implementation

- NimBLE peripheral advertises the PARKING TRACE custom 128-bit service UUID.
- Read-only Device ID, Protocol Version, and Device Status characteristics.
- Telemetry characteristic supports notifications.
- A development-only telemetry task can send a 40-byte V1.0 packet once per second after the client subscribes.
- Simulated packets deliberately mark all sensor values invalid; no fake GPS or sensor readings are presented as real data.

The demo notification option is **disabled by default**.

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
idf.py menuconfig
idf.py build
```

To enable the development notification stream, open `idf.py menuconfig`, navigate to **PARKING TRACE Firmware**, and enable **Enable simulated telemetry notifications (development only)**. Build again afterwards.

Keep this option disabled for production firmware. The simulated packet contains a valid schema/version/state/sequence but leaves all sensor-validity flags clear.

## BLE characteristics

| Characteristic | Access | Current value |
|---|---|---|
| Device ID | Read | PT-XXXXXX |
| Protocol Version | Read | 1.0 |
| Device Status | Read | READY |
| Telemetry | Notify | 40-byte V1.0 packet (development option only) |

The UUIDs and packet offsets must remain synchronized with `docs/DEVICE_PROTOCOL_V1.md`.

## Important limitations

- Device ID is an identifier, not an authentication secret.
- The MAC-derived ID is development-only and does not guarantee global uniqueness. Production IDs must be provisioned centrally and stored in NVS.
- Do not treat a matching Device ID as authorization to trust a device.
- Secure claim/pairing and challenge-response authentication must be implemented before production use.
- BLE code has not yet been compiled or tested on physical hardware in this development session.
- No vehicle-control interfaces are implemented; the device is sensing-only.
