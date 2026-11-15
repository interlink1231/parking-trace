#pragma once

#include <stdint.h>

/*
 * PARKING TRACE Device Protocol V1.0
 * Keep these UUIDs synchronized with docs/DEVICE_PROTOCOL_V1.md.
 */

#define PT_PROTOCOL_VERSION "1.0"
#define PT_DEVICE_ID_PREFIX "PT-"
#define PT_DEVICE_ID_LENGTH 9

#define PT_BLE_SERVICE_UUID \
    "7b2a0001-6d4f-4a91-9c20-4e8f50545243"
#define PT_BLE_DEVICE_ID_UUID \
    "7b2a0002-6d4f-4a91-9c20-4e8f50545243"
#define PT_BLE_PROTOCOL_VERSION_UUID \
    "7b2a0003-6d4f-4a91-9c20-4e8f50545243"
#define PT_BLE_DEVICE_STATUS_UUID \
    "7b2a0004-6d4f-4a91-9c20-4e8f50545243"
#define PT_BLE_AUTHENTICATION_UUID \
    "7b2a0005-6d4f-4a91-9c20-4e8f50545243"
#define PT_BLE_TELEMETRY_UUID \
    "7b2a0006-6d4f-4a91-9c20-4e8f50545243"
#define PT_BLE_CONTROL_UUID \
    "7b2a0007-6d4f-4a91-9c20-4e8f50545243"

typedef enum {
    PT_STATE_BOOTING = 0,
    PT_STATE_READY = 1,
    PT_STATE_MOVING = 2,
    PT_STATE_PARKED = 3,
    PT_STATE_DEGRADED = 4,
    PT_STATE_ERROR = 5
} pt_device_state_t;
