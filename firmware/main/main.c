#include <stdio.h>

#include "esp_err.h"
#include "esp_log.h"
#include "nvs_flash.h"

#include "pt_protocol.h"

static const char *TAG = "parking_trace";

void app_main(void)
{
    esp_err_t err = nvs_flash_init();

    if (err == ESP_ERR_NVS_NO_FREE_PAGES ||
        err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);

    ESP_LOGI(TAG, "PARKING TRACE firmware starting");
    ESP_LOGI(TAG, "Protocol version: %s", PT_PROTOCOL_VERSION);
    ESP_LOGI(TAG, "BLE service UUID: %s", PT_BLE_SERVICE_UUID);

    /*
     * Next milestone:
     * - Load provisioned device identity from NVS.
     * - Initialize the selected BLE host (NimBLE).
     * - Advertise the PARKING TRACE service.
     * - Expose Device ID and Protocol Version characteristics.
     *
     * BLE is intentionally not started here until the ESP-IDF/NimBLE
     * configuration and secure provisioning flow are pinned down.
     */
}
