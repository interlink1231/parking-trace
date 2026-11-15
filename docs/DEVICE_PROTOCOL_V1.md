# PARKING TRACE DEVICE PROTOCOL V1.0

- Status: Draft specification
- Target device: Vehicle-mounted PARKING TRACE unit
- MCU / radio: ESP32-S3, Bluetooth Low Energy
- App: Android (Kotlin)
- Purpose: Device identification, secure connection, and sensor telemetry

## 1. Core principles

1. One device ID identifies one complete vehicle-mounted unit, not an individual sensor or development board.
2. The app stores the device ID entered by the user and searches for that exact unit over BLE.
3. The device ID is an identifier, not a password. A matching ID alone must never grant trusted access.
4. Sensor values are accepted only after the device has passed the authentication procedure.
5. The web UI currently demonstrates registration only. BLE scanning, authentication, persistence, and telemetry are not implemented yet.

## 2. Device identity

| Field | V1.0 rule |
|---|---|
| Format | `PT-XXXXXX` |
| Example | `PT-000001` |
| Assigned to | One complete vehicle-mounted unit |
| Uniqueness | Globally unique within PARKING TRACE production |
| Storage | ESP32-S3 non-volatile storage (NVS) |
| App entry | User enters the printed device ID |
| Mutability | Fixed after provisioning; replacement requires an authorized service procedure |

The production process must reserve IDs centrally to avoid duplicates. The sample ID in the UI is demonstration data only.

## 3. BLE discovery

- Device advertises a dedicated PARKING TRACE GATT service.
- Advertised local name: `PT-XXXXXX` (the exact provisioned ID).
- The app filters by the PARKING TRACE service UUID, then reads the Device ID characteristic and compares it with the user's registered ID.
- Do not put passwords, private keys, claim secrets, or personal information in advertising packets.
- If the ID is not available in the advertising payload, the app connects provisionally and reads it from the GATT Device ID characteristic before proceeding.

### 3.1 GATT identifiers

The following custom 128-bit UUIDs are reserved for this project. Treat them as project constants and do not change them after V1.0 firmware or app releases without a protocol version change.

| GATT item | UUID |
|---|---|
| PARKING TRACE Service | `7b2a0001-6d4f-4a91-9c20-4e8f50545243` |
| Device ID | `7b2a0002-6d4f-4a91-9c20-4e8f50545243` |
| Protocol Version | `7b2a0003-6d4f-4a91-9c20-4e8f50545243` |
| Device Status | `7b2a0004-6d4f-4a91-9c20-4e8f50545243` |
| Authentication | `7b2a0005-6d4f-4a91-9c20-4e8f50545243` |
| Telemetry | `7b2a0006-6d4f-4a91-9c20-4e8f50545243` |
| Control | `7b2a0007-6d4f-4a91-9c20-4e8f50545243` |

### 3.2 Characteristic properties

| Characteristic | Properties | Purpose |
|---|---|---|
| Device ID | Read | Returns provisioned ID, UTF-8 |
| Protocol Version | Read | Returns protocol version, e.g. `1.0` |
| Device Status | Read, Notify | Connection and sensor readiness |
| Authentication | Write, Indicate | Secure pairing/authentication exchange |
| Telemetry | Notify | Sensor and positioning data |
| Control | Write | Approved app commands |

## 4. Authentication and ownership

A device ID is public identification data and is not sufficient proof of ownership.

V1.0 pairing requirements:

1. Each unit receives a unique random secret during trusted provisioning.
2. The app must obtain a one-time claim code from the physical device label or another controlled provisioning method. The claim code must not be derivable from the device ID.
3. The app and device perform a challenge-response exchange using a cryptographic proof based on the per-device secret.
4. Secrets must not be transmitted as plaintext over BLE or stored in source code.
5. After successful pairing, the app stores an OS-protected credential and the device remembers the authorized bond/owner state.
6. A factory reset or ownership transfer must require a deliberate physical/service procedure.

The exact cryptographic message encoding and recovery procedure must be finalized before production firmware. Do not ship an implementation that treats a matching ID or an unauthenticated BLE connection as trusted.

## 5. Telemetry payload — V1.0 binary layout

Telemetry is sent only after authentication. Each notification is exactly **40 bytes**. Multi-byte integers use **little-endian** byte order; signed values use two's-complement representation. The app rejects unknown schema versions and packet lengths other than 40 bytes.

| Offset | Size | Field | Encoding / unit |
|---:|---:|---|---|
| 0 | 1 | schema_version | uint8; value 1 |
| 1 | 2 | sequence | uint16; increments per report and wraps at 65535 |
| 3 | 4 | timestamp | uint32 Unix seconds; 0 if not synchronized |
| 7 | 1 | gnss_fix | 0=no fix, 1=2D, 2=3D |
| 8 | 4 | latitude | int32; degrees × 10^7 |
| 12 | 4 | longitude | int32; degrees × 10^7 |
| 16 | 4 | altitude_mm | int32; GNSS altitude in millimetres |
| 20 | 4 | pressure_pa | uint32; pascals |
| 24 | 2 | temperature_centi_c | int16; degrees Celsius × 100 |
| 26 | 2 | accel_x_mg | int16; milli-g |
| 28 | 2 | accel_y_mg | int16; milli-g |
| 30 | 2 | accel_z_mg | int16; milli-g |
| 32 | 2 | gyro_x_mdps | int16; milli-degrees/second |
| 34 | 2 | gyro_y_mdps | int16; milli-degrees/second |
| 36 | 2 | gyro_z_mdps | int16; milli-degrees/second |
| 38 | 1 | device_state | Device state enum in section 6 |
| 39 | 1 | sensor_flags | Sensor availability bit flags |

### 5.1 Validity rules

- If `gnss_fix=0`, latitude, longitude, and altitude must be ignored.
- If the BMP390 flag is clear, pressure and temperature must be ignored.
- If the MPU6050 flag is clear, all acceleration and gyroscope fields must be ignored.
- A zero timestamp means device time is not synchronized; the app uses its own receive time for freshness tracking.
- Firmware must never substitute fabricated sensor values for unavailable readings.

### 5.2 Sensor flags

| Bit | Mask | Meaning |
|---:|---:|---|
| 0 | 0x01 | GNSS data valid |
| 1 | 0x02 | BMP390 data valid |
| 2 | 0x04 | MPU6050 data valid |
| 3–7 | — | Reserved; transmit as 0 and ignore when received |

### 5.3 Notification rate

The target telemetry notification rate is 1 Hz. The sequence number increments once per emitted packet, not once per sensor sample. Raw IMU samples are processed on the device and are not streamed individually in V1.0.

## 6. Device states

- `BOOTING`: firmware starting
- `READY`: sensors initialized and waiting
- `MOVING`: movement detected
- `PARKED`: parked state detected
- `DEGRADED`: one or more sensors unavailable
- `ERROR`: unrecoverable device fault

The app must distinguish BLE-connected from telemetry-ready. A connected device does not necessarily have a valid GNSS fix.

## 7. App behavior

1. User enters the device ID.
2. App validates the `PT-XXXXXX` format and saves it as pending registration.
3. App requests the required Bluetooth permissions and scans while the user is on the device-registration screen or has enabled automatic reconnection.
4. App discovers the PARKING TRACE service and reads the device ID.
5. If the ID does not match, the app disconnects and ignores that device.
6. If it matches, the app runs authentication.
7. On success, app stores the authorized device association and connects automatically when the device is available.
8. On disconnect, app retries with bounded backoff and visible status; it must not scan continuously without limits.
9. App timestamps received data and clearly marks stale, unavailable, or estimated values.

Android BLE permissions and background scanning behavior must be implemented according to the Android versions supported by the app.

## 8. Initial operating targets

These are starting targets for testing, not guaranteed performance:

| Data source | Target sampling |
|---|---:|
| GNSS | 1 Hz |
| BMP390 | 5 Hz |
| MPU6050 | 50 Hz |
| BLE telemetry | 1 Hz summary |

Raw IMU samples should be processed on the device where possible. The app generally needs movement summaries and positioning state, not every raw sensor sample.

## 9. Safety and reliability

- The unit must be securely mounted and must not obstruct driver visibility or airbags.
- The app must not show a floor or location as confirmed when only an estimate is available.
- Indoor/underground floor estimation is probabilistic and must include confidence/unknown states.
- BLE loss must not erase the last successfully saved parking record.
- No vehicle control functions are part of V1.0; this device is for sensing and parking-location assistance only.

## 10. Implementation phases

### Phase A — Protocol freeze
- Confirm device ID provisioning and label format.
- Confirm GATT UUIDs and characteristic properties.
- Finalize authentication exchange.
- Freeze telemetry byte layout and error codes.

### Phase B — Firmware proof of concept
- Advertise the service and device ID.
- Implement GATT reads and notifications.
- Implement authentication.
- Publish simulated telemetry before connecting real sensors.

### Phase C — Android BLE proof of concept
- Scan and display nearby PARKING TRACE units.
- Match exact device ID.
- Authenticate and connect.
- Display connection and telemetry status.

### Phase D — Sensor integration
- Integrate GNSS, BMP390, and MPU6050.
- Validate sampling and timestamps.
- Test outdoor, indoor, and underground behavior.

## 11. Current project status

- Web UI: demo implementation.
- Device ID registration form: demo state only; it does not yet persist securely or scan BLE.
- 3D device preview: illustrative CSS artwork, not a dimensionally accurate CAD model.
- BLE firmware: initial NimBLE advertising and read-only GATT identity/status characteristics implemented in source; not yet compiled or hardware-tested.
- Android BLE client: not implemented.
- Authentication: specification requirement; implementation pending.
- Telemetry: V1.0 40-byte little-endian packet layout defined; GATT notification implementation pending.

