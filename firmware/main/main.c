#include <stdbool.h>
#include <stdio.h>
#include <string.h>

#include "sdkconfig.h"
#include "esp_err.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "nvs_flash.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"
#include "host/ble_hs.h"
#include "host/ble_uuid.h"
#include "host/ble_gap.h"
#include "host/ble_gatt.h"
#include "services/gap/ble_svc_gap.h"
#include "services/gatt/ble_svc_gatt.h"

#include "pt_protocol.h"

static const char *TAG = "parking_trace";

static char s_device_id[PT_DEVICE_ID_LENGTH + 1];
static uint16_t s_device_id_handle;
static uint16_t s_protocol_handle;
static uint16_t s_status_handle;
static uint16_t s_telemetry_handle;
static uint16_t s_connection_handle = BLE_HS_CONN_HANDLE_NONE;
static uint8_t s_own_addr_type;
static bool s_telemetry_subscribed;

/* NimBLE stores 128-bit UUID bytes in little-endian order. */
static const ble_uuid128_t s_service_uuid =
    BLE_UUID128_INIT(0x43, 0x52, 0x54, 0x50, 0x8f, 0x4e, 0x20, 0x9c,
                     0x91, 0x4a, 0x4f, 0x6d, 0x01, 0x00, 0x2a, 0x7b);
static const ble_uuid128_t s_device_id_uuid =
    BLE_UUID128_INIT(0x43, 0x52, 0x54, 0x50, 0x8f, 0x4e, 0x20, 0x9c,
                     0x91, 0x4a, 0x4f, 0x6d, 0x02, 0x00, 0x2a, 0x7b);
static const ble_uuid128_t s_protocol_uuid =
    BLE_UUID128_INIT(0x43, 0x52, 0x54, 0x50, 0x8f, 0x4e, 0x20, 0x9c,
                     0x91, 0x4a, 0x4f, 0x6d, 0x03, 0x00, 0x2a, 0x7b);
static const ble_uuid128_t s_status_uuid =
    BLE_UUID128_INIT(0x43, 0x52, 0x54, 0x50, 0x8f, 0x4e, 0x20, 0x9c,
                     0x91, 0x4a, 0x4f, 0x6d, 0x04, 0x00, 0x2a, 0x7b);
static const ble_uuid128_t s_telemetry_uuid =
    BLE_UUID128_INIT(0x43, 0x52, 0x54, 0x50, 0x8f, 0x4e, 0x20, 0x9c,
                     0x91, 0x4a, 0x4f, 0x6d, 0x06, 0x00, 0x2a, 0x7b);

static int read_string_characteristic(struct ble_gatt_access_ctxt *ctxt,
                                      void *arg)
{
    const char *value = (const char *)arg;
    const size_t length = strlen(value);

    if (ctxt->op != BLE_GATT_ACCESS_OP_READ_CHR) {
        return BLE_ATT_ERR_UNLIKELY;
    }

    return os_mbuf_append(ctxt->om, value, length) == 0
               ? 0
               : BLE_ATT_ERR_INSUFFICIENT_RES;
}

static const struct ble_gatt_chr_def s_characteristics[] = {
    {
        .uuid = &s_device_id_uuid.u,
        .access_cb = read_string_characteristic,
        .arg = s_device_id,
        .flags = BLE_GATT_CHR_F_READ,
        .val_handle = &s_device_id_handle,
    },
    {
        .uuid = &s_protocol_uuid.u,
        .access_cb = read_string_characteristic,
        .arg = PT_PROTOCOL_VERSION,
        .flags = BLE_GATT_CHR_F_READ,
        .val_handle = &s_protocol_handle,
    },
    {
        .uuid = &s_status_uuid.u,
        .access_cb = read_string_characteristic,
        .arg = "READY",
        .flags = BLE_GATT_CHR_F_READ,
        .val_handle = &s_status_handle,
    },
    {
        .uuid = &s_telemetry_uuid.u,
        .flags = BLE_GATT_CHR_F_NOTIFY,
        .val_handle = &s_telemetry_handle,
    },
    {0},
};

static const struct ble_gatt_svc_def s_services[] = {
    {
        .type = BLE_GATT_SVC_TYPE_PRIMARY,
        .uuid = &s_service_uuid.u,
        .characteristics = s_characteristics,
    },
    {0},
};

static void start_advertising(void);

static int gap_event(struct ble_gap_event *event, void *arg)
{
    (void)arg;

    switch (event->type) {
    case BLE_GAP_EVENT_CONNECT:
        if (event->connect.status == 0) {
            s_connection_handle = event->connect.conn_handle;
            s_telemetry_subscribed = false;
            ESP_LOGI(TAG, "BLE client connected");
        } else {
            ESP_LOGW(TAG, "BLE connection failed; restarting advertising");
            start_advertising();
        }
        return 0;

    case BLE_GAP_EVENT_DISCONNECT:
        s_connection_handle = BLE_HS_CONN_HANDLE_NONE;
        s_telemetry_subscribed = false;
        ESP_LOGI(TAG, "BLE client disconnected; restarting advertising");
        start_advertising();
        return 0;

    case BLE_GAP_EVENT_SUBSCRIBE:
        if (event->subscribe.attr_handle == s_telemetry_handle) {
            s_connection_handle = event->subscribe.conn_handle;
            s_telemetry_subscribed = event->subscribe.cur_notify;
            ESP_LOGI(TAG, "Telemetry notifications %s",
                     s_telemetry_subscribed ? "enabled" : "disabled");
        }
        return 0;

    case BLE_GAP_EVENT_ADV_COMPLETE:
        ESP_LOGI(TAG, "BLE advertising complete; restarting");
        start_advertising();
        return 0;

    default:
        return 0;
    }
}

static void start_advertising(void)
{
    struct ble_hs_adv_fields fields;
    memset(&fields, 0, sizeof(fields));

    fields.flags = BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP;
    fields.name = (const uint8_t *)s_device_id;
    fields.name_len = (uint8_t)strlen(s_device_id);
    fields.name_is_complete = 1;
    fields.uuids128 = (ble_uuid128_t *)&s_service_uuid;
    fields.num_uuids128 = 1;
    fields.uuids128_is_complete = 1;

    int rc = ble_gap_adv_set_fields(&fields);
    if (rc != 0) {
        ESP_LOGE(TAG, "ble_gap_adv_set_fields failed: %d", rc);
        return;
    }

    struct ble_gap_adv_params params;
    memset(&params, 0, sizeof(params));
    params.conn_mode = BLE_GAP_CONN_MODE_UND;
    params.disc_mode = BLE_GAP_DISC_MODE_GEN;

    rc = ble_gap_adv_start(s_own_addr_type, NULL, BLE_HS_FOREVER,
                           &params, gap_event, NULL);
    if (rc != 0) {
        ESP_LOGE(TAG, "ble_gap_adv_start failed: %d", rc);
        return;
    }

    ESP_LOGI(TAG, "Advertising as %s", s_device_id);
}

static void on_ble_sync(void)
{
    int rc = ble_hs_id_infer_auto(0, &s_own_addr_type);
    if (rc != 0) {
        ESP_LOGE(TAG, "Could not infer BLE address type: %d", rc);
        return;
    }

    start_advertising();
}

static void nimble_host_task(void *param)
{
    (void)param;
    nimble_port_run();
    nimble_port_freertos_deinit();
}

static void make_device_id(void)
{
    uint8_t mac[6] = {0};
    ESP_ERROR_CHECK(esp_read_mac(mac, ESP_MAC_BT));

    /* Development-only ID. Production IDs must be provisioned centrally. */
    snprintf(s_device_id, sizeof(s_device_id), "PT-%02X%02X%02X",
             mac[3], mac[4], mac[5]);
}

#if CONFIG_PT_DEMO_TELEMETRY
static void put_u16_le(uint8_t *buffer, size_t offset, uint16_t value)
{
    buffer[offset] = (uint8_t)(value & 0xff);
    buffer[offset + 1] = (uint8_t)(value >> 8);
}

static void put_u32_le(uint8_t *buffer, size_t offset, uint32_t value)
{
    buffer[offset] = (uint8_t)(value & 0xff);
    buffer[offset + 1] = (uint8_t)((value >> 8) & 0xff);
    buffer[offset + 2] = (uint8_t)((value >> 16) & 0xff);
    buffer[offset + 3] = (uint8_t)(value >> 24);
}

static void build_demo_packet(uint8_t packet[PT_TELEMETRY_PACKET_SIZE],
                              uint16_t sequence)
{
    memset(packet, 0, PT_TELEMETRY_PACKET_SIZE);

    packet[PT_TELEMETRY_OFFSET_SCHEMA_VERSION] =
        PT_TELEMETRY_SCHEMA_VERSION;
    put_u16_le(packet, PT_TELEMETRY_OFFSET_SEQUENCE, sequence);

    /* Timestamp remains zero until the device has a trusted wall clock. */
    packet[PT_TELEMETRY_OFFSET_GNSS_FIX] = 0;
    packet[PT_TELEMETRY_OFFSET_DEVICE_STATE] = PT_STATE_READY;

    /* All sensor-validity bits remain clear: no sensor data is fabricated. */
    packet[PT_TELEMETRY_OFFSET_SENSOR_FLAGS] = 0;
}

static void telemetry_demo_task(void *param)
{
    (void)param;
    uint16_t sequence = 0;

    ESP_LOGW(TAG, "DEVELOPMENT MODE: simulated telemetry notifications enabled");
    ESP_LOGW(TAG, "Sensor fields are marked invalid; no real sensor data is sent");

    while (1) {
        vTaskDelay(pdMS_TO_TICKS(1000));

        if (!s_telemetry_subscribed ||
            s_connection_handle == BLE_HS_CONN_HANDLE_NONE) {
            continue;
        }

        uint8_t packet[PT_TELEMETRY_PACKET_SIZE];
        build_demo_packet(packet, sequence++);

        struct os_mbuf *om = ble_hs_mbuf_from_flat(
            packet, sizeof(packet));
        if (om == NULL) {
            ESP_LOGW(TAG, "Could not allocate telemetry notification buffer");
            continue;
        }

        int rc = ble_gatts_notify_custom(
            s_connection_handle, s_telemetry_handle, om);
        if (rc != 0) {
            ESP_LOGW(TAG, "Telemetry notification failed: %d", rc);
        } else {
            ESP_LOGD(TAG, "Sent demo telemetry packet");
        }
    }
}
#endif

void app_main(void)
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES ||
        err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);

    make_device_id();

    ESP_LOGI(TAG, "PARKING TRACE firmware starting");
    ESP_LOGI(TAG, "Device ID: %s", s_device_id);
    ESP_LOGI(TAG, "Protocol version: %s", PT_PROTOCOL_VERSION);

#if CONFIG_PT_DEMO_TELEMETRY
    ESP_LOGW(TAG, "Demo telemetry is enabled; do not use this build in production");
#else
    ESP_LOGI(TAG, "Demo telemetry is disabled");
#endif

    ESP_ERROR_CHECK(nimble_port_init());

    ble_hs_cfg.sync_cb = on_ble_sync;
    ble_svc_gap_init();
    ble_svc_gatt_init();

    ESP_ERROR_CHECK(ble_svc_gap_device_name_set(s_device_id));

    int rc = ble_gatts_count_cfg(s_services);
    if (rc != 0) {
        ESP_LOGE(TAG, "ble_gatts_count_cfg failed: %d", rc);
        return;
    }

    rc = ble_gatts_add_svcs(s_services);
    if (rc != 0) {
        ESP_LOGE(TAG, "ble_gatts_add_svcs failed: %d", rc);
        return;
    }

#if CONFIG_PT_DEMO_TELEMETRY
    xTaskCreate(telemetry_demo_task, "pt_telemetry_demo", 3072, NULL, 5, NULL);
#endif

    nimble_port_freertos_init(nimble_host_task);
}
