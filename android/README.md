# PARKING TRACE Android

Kotlin + Jetpack Compose 기반 Android BLE 테스트 앱입니다.

## 실행
1. Android Studio에서 저장소의 `android` 폴더를 엽니다.
2. Gradle Sync를 완료합니다.
3. Android 휴대폰에서 Bluetooth를 켜고 앱을 실행합니다.
4. Bluetooth 권한을 허용한 뒤 기기를 검색하고 연결합니다.

## 구현
- PARKING TRACE 서비스 UUID로 BLE 기기 검색
- Device ID / Protocol Version / Device Status 읽기
- Telemetry Notify 구독
- 40바이트 V1.0 패킷 기본 디코딩
- 화이트 + 블루 디자인

## 테스트 조건
ESP32-S3 보드가 아직 없어 실제 BLE 연결 및 기기 테스트는 미검증 상태입니다.
펌웨어의 개발용 Telemetry Notify 옵션을 활성화해야 개발 패킷이 전송됩니다.
센서 유효 플래그가 없는 값은 앱에서 실제 측정값으로 표시하지 않습니다.

## 환경
- Android Studio 안정 버전
- JDK 17
- Android SDK 35
- minSdk 26
