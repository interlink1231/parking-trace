package com.parkingtrace.app

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.ParcelUuid
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID

private val Blue = Color(0xFF246BFD)
private val Ink = Color(0xFF17243A)
private val Muted = Color(0xFF7D8BA1)
private val Page = Color(0xFFF4F7FC)
private val ServiceId = UUID.fromString("7b2a0001-6d4f-4a91-9c20-4e8f50545243")
private val DeviceId = UUID.fromString("7b2a0002-6d4f-4a91-9c20-4e8f50545243")
private val ProtocolId = UUID.fromString("7b2a0003-6d4f-4a91-9c20-4e8f50545243")
private val StatusId = UUID.fromString("7b2a0004-6d4f-4a91-9c20-4e8f50545243")
private val TelemetryId = UUID.fromString("7b2a0006-6d4f-4a91-9c20-4e8f50545243")
private val CccdId = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

data class Nearby(val device: BluetoothDevice, val label: String)
data class Packet(val sequence: Int, val state: String, val fix: Int, val flags: Int, val pressure: Long, val temp: Double, val lat: Double?, val lon: Double?)

class MainActivity : ComponentActivity() {
    private val devices = mutableStateListOf<Nearby>()
    private val status = mutableStateOf("연결 대기")
    private val deviceId = mutableStateOf("—")
    private val version = mutableStateOf("—")
    private val deviceStatus = mutableStateOf("—")
    private val packet = mutableStateOf<Packet?>(null)
    private val packetInfo = mutableStateOf("수신 대기 중")
    private val isScanning = mutableStateOf(false)
    private val targetDeviceId = mutableStateOf("")
    private var gatt: BluetoothGatt? = null
    private val pendingReads = ArrayDeque<BluetoothGattCharacteristic>()
    private val adapter by lazy { BluetoothAdapter.getDefaultAdapter() }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val d = result.device
            if (devices.none { it.device.address == d.address }) {
                val label = runCatching { d.name }.getOrNull() ?: result.scanRecord?.deviceName ?: "PARKING TRACE"
                devices.add(Nearby(d, label))
            }
            val requestedId = targetDeviceId.value.trim().uppercase()
            if (requestedId.matches(Regex("PT-[0-9A-F]{6}")) && label.uppercase() == requestedId) {
                adapter?.bluetoothLeScanner?.stopScan(this)
                isScanning.value = false
                connect(d)
            }
        }
        override fun onScanFailed(errorCode: Int) {
            isScanning.value = false
            status.value = "검색 실패 ($errorCode)"
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, statusCode: Int, newState: Int) {
            if (statusCode != BluetoothGatt.GATT_SUCCESS) {
                status.value = "연결 오류 ($statusCode)"
                g.close()
                gatt = null
            } else if (newState == BluetoothProfile.STATE_CONNECTED) {
                status.value = "서비스 확인 중"
                g.discoverServices()
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                status.value = "연결 끊김"
                g.close()
                gatt = null
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, statusCode: Int) {
            if (statusCode != BluetoothGatt.GATT_SUCCESS) {
                status.value = "서비스 탐색 실패"
                return
            }
            val service = g.getService(ServiceId)
            if (service == null) {
                status.value = "PARKING TRACE 기기가 아닙니다."
                return
            }
            status.value = "기기 연결됨"
            pendingReads.clear()
            service.getCharacteristic(DeviceId)?.let { pendingReads.add(it) }
            service.getCharacteristic(ProtocolId)?.let { pendingReads.add(it) }
            service.getCharacteristic(StatusId)?.let { pendingReads.add(it) }
            readNext(g)
        }

        @Deprecated("Deprecated by Android")
        override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, result: Int) {
            if (result == BluetoothGatt.GATT_SUCCESS) readValue(c.uuid, c.value ?: byteArrayOf())
            readNext(g)
        }
        override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray, result: Int) {
            if (result == BluetoothGatt.GATT_SUCCESS) readValue(c.uuid, value)
            readNext(g)
        }
        @Deprecated("Deprecated by Android")
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic) {
            readValue(c.uuid, c.value ?: byteArrayOf())
        }
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray) {
            readValue(c.uuid, value)
        }
    }

    @SuppressLint("MissingPermission")
    private fun readNext(g: BluetoothGatt) {
        val next = pendingReads.removeFirstOrNull()
        if (next != null) {
            g.readCharacteristic(next)
            return
        }
        val telemetry = g.getService(ServiceId)?.getCharacteristic(TelemetryId) ?: return
        g.setCharacteristicNotification(telemetry, true)
        val descriptor = telemetry.getDescriptor(CccdId) ?: return
        if (Build.VERSION.SDK_INT >= 33) {
            g.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
        } else {
            @Suppress("DEPRECATION")
            descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
            @Suppress("DEPRECATION")
            g.writeDescriptor(descriptor)
        }
    }

    private fun readValue(uuid: UUID, bytes: ByteArray) {
        when (uuid) {
            DeviceId -> deviceId.value = bytes.toString(Charsets.UTF_8)
            ProtocolId -> version.value = bytes.toString(Charsets.UTF_8)
            StatusId -> deviceStatus.value = bytes.toString(Charsets.UTF_8)
            TelemetryId -> {
                if (bytes.size != 40 || (bytes[0].toInt() and 255) != 1) {
                    packetInfo.value = "지원하지 않는 패킷 · ${bytes.size} bytes"
                    return
                }
                val b = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
                val fix = bytes[7].toInt() and 255
                val flags = bytes[39].toInt() and 255
                val state = when (bytes[38].toInt() and 255) {
                    0 -> "부팅 중"; 1 -> "준비"; 2 -> "이동 중"; 3 -> "주차됨"; 4 -> "일부 기능 제한"; 5 -> "오류"; else -> "알 수 없음"
                }
                packet.value = Packet(
                    b.getShort(1).toInt() and 65535, state, fix, flags,
                    b.getInt(20).toLong() and 0xffffffffL,
                    b.getShort(24).toInt() / 100.0,
                    if (fix > 0 && flags and 1 != 0) b.getInt(8) / 1e7 else null,
                    if (fix > 0 && flags and 1 != 0) b.getInt(12) / 1e7 else null
                )
                packetInfo.value = "V1.0 패킷 · 40 bytes · #${packet.value?.sequence}"
            }
        }
    }

    private fun permitted(): Boolean {
        val list = if (Build.VERSION.SDK_INT >= 31) listOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        else listOf(Manifest.permission.ACCESS_FINE_LOCATION)
        return list.all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }
    }

    @SuppressLint("MissingPermission")
    private fun scan() {
        val scanner = adapter?.bluetoothLeScanner
        if (scanner == null) { status.value = "Bluetooth LE를 사용할 수 없습니다."; return }
        devices.clear()
        isScanning.value = true
        status.value = "주변 기기 검색 중"
        val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(ServiceId)).build()
        scanner.startScan(listOf(filter), ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scanCallback)
        window.decorView.postDelayed({
            if (isScanning.value) {
                scanner.stopScan(scanCallback)
                isScanning.value = false
                status.value = if (devices.isEmpty()) "기기를 찾지 못했습니다." else "검색 완료"
            }
        }, 10000)
    }

    @SuppressLint("MissingPermission")
    private fun connect(device: BluetoothDevice) {
        gatt?.close()
        status.value = "연결 중"
        gatt = device.connectGatt(this, false, gattCallback)
    }

    @SuppressLint("MissingPermission")
    private fun disconnect() {
        gatt?.disconnect()
        gatt?.close()
        gatt = null
        status.value = "연결 해제됨"
        deviceId.value = "—"
        version.value = "—"
        deviceStatus.value = "—"
        packet.value = null
    }

    override fun onDestroy() {
        gatt?.close()
        super.onDestroy()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val permissionRequest = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
                if (result.values.all { it }) scan() else status.value = "Bluetooth 권한이 필요합니다."
            }
            TraceScreen(
                devices, status.value, deviceId.value, version.value, deviceStatus.value,
                packet.value, packetInfo.value, isScanning.value, targetDeviceId.value,
                onTargetIdChange = { targetDeviceId.value = it.uppercase() },
                onScan = {
                    if (permitted()) scan()
                    else permissionRequest.launch(
                        if (Build.VERSION.SDK_INT >= 31) arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
                        else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
                    )
                },
                onConnect = ::connect,
                onDisconnect = ::disconnect
            )
        }
    }
}

@Composable
private fun TraceScreen(
    devices: List<Nearby>, status: String, deviceId: String, version: String, deviceStatus: String,
    packet: Packet?, packetInfo: String, scanning: Boolean, targetDeviceId: String,
    onTargetIdChange: (String) -> Unit,
    onScan: () -> Unit, onConnect: (BluetoothDevice) -> Unit, onDisconnect: () -> Unit
) {
    MaterialTheme {
        Surface(Modifier.fillMaxSize(), color = Page) {
            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(15.dp)
            ) {
                item {
                    Spacer(Modifier.height(18.dp))
                    Text("PARKING TRACE", color = Blue, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.8.sp)
                    Text("기기 연결 테스트", color = Ink, fontSize = 27.sp, fontWeight = FontWeight.Bold)
                    Text("차량에 장착된 기기를 연결하고 센서 데이터를 확인합니다.", color = Muted, fontSize = 13.sp)
                }
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                        Column(Modifier.fillMaxWidth().padding(18.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(42.dp).background(Blue.copy(alpha = .10f), CircleShape), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Bluetooth, contentDescription = null, tint = Blue)
                                }
                                Column(Modifier.weight(1f).padding(start = 12.dp)) {
                                    Text("BLE 연결 상태", color = Muted, fontSize = 12.sp)
                                    Text(status, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                                }
                                if (scanning) CircularProgressIndicator(Modifier.size(20.dp), color = Blue, strokeWidth = 2.dp)
                            }
                            Spacer(Modifier.height(15.dp))
                            OutlinedTextField(
                                value = targetDeviceId,
                                onValueChange = onTargetIdChange,
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("기기 고유번호") },
                                placeholder = { Text("예: PT-A1B2C3") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )
                            Spacer(Modifier.height(8.dp))
                            Button(onClick = onScan, Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Blue), shape = RoundedCornerShape(13.dp)) {
                                Text(if (scanning) "검색 중..." else "기기 검색 및 자동 연결")
                            }
                            if (deviceId != "—") {
                                Spacer(Modifier.height(8.dp))
                                OutlinedButtonFull(onDisconnect)
                            }
                        }
                    }
                }
                item {
                    Heading("연결된 기기")
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp)) {
                        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                            Info("기기 고유번호", deviceId)
                            Info("프로토콜 버전", version)
                            Info("기기 상태", deviceStatus)
                        }
                    }
                }
                item {
                    Heading("Telemetry 센서 데이터")
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp)) {
                        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Info("패킷", packetInfo)
                            Info("동작 상태", packet?.state ?: "데이터 대기")
                            Info("GNSS", when (packet?.fix) { 1 -> "2D Fix"; 2 -> "3D Fix"; 0 -> "Fix 없음"; else -> "—" })
                            Info("센서 유효 플래그", packet?.flags?.toString() ?: "—")
                            Info("기압", packet?.takeIf { it.flags and 2 != 0 }?.let { "${it.pressure} Pa" } ?: "유효 데이터 없음")
                            Info("온도", packet?.takeIf { it.flags and 2 != 0 }?.let { "${"%.2f".format(it.temp)} °C" } ?: "유효 데이터 없음")
                            Info("GPS 좌표", packet?.lat?.let { "${"%.6f".format(it)}, ${"%.6f".format(packet.lon)}" } ?: "유효 데이터 없음")
                        }
                    }
                }
                item { Heading("검색된 기기") }
                if (devices.isEmpty()) item { Text("검색된 기기가 여기에 표시됩니다.", color = Muted, fontSize = 13.sp) }
                items(devices, key = { it.device.address }) { found ->
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp)) {
                        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(found.label, color = Ink, fontWeight = FontWeight.SemiBold)
                                Text(found.device.address, color = Muted, fontSize = 11.sp)
                            }
                            Button(onClick = { onConnect(found.device) }, colors = ButtonDefaults.buttonColors(containerColor = Blue)) { Text("연결") }
                        }
                    }
                }
                item { Text("개발용 앱 · BLE 연결 및 V1.0 패킷 확인", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(bottom = 26.dp)) }
            }
        }
    }
}

@Composable
private fun OutlinedButtonFull(onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(13.dp)) { Text("연결 해제") }
}
@Composable
private fun Heading(text: String) {
    Text(text, color = Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
}
@Composable
private fun Info(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = Muted, fontSize = 13.sp)
        Text(value, color = Ink, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}
