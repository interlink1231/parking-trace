# PARKING TRACE WEB

PARKING TRACE의 모바일 우선 웹 UI 프로토타입입니다.

## 기술 스택
- React
- TypeScript
- Vite
- Lucide React

## 실행
```bash
npm install
npm run dev
```

## 빌드
```bash
npm run build
```

## 화면
- 홈 대시보드
- 차량 위치 (샘플 지도)
- 주차 기록 및 검색
- ESP32-S3 기기 / 센서 상태
- 테마 및 앱 설정

## 현재 범위
현재 UI는 DEMO 데이터 기반입니다. 실제 GNSS, BMP390, MPU6050, ESP32-S3 BLE 및 지도 API는 아직 연결되어 있지 않습니다.

## 배포
Vercel에서 Framework Preset을 Vite로 선택하고 배포할 수 있습니다.

## Android 앱
Kotlin + Jetpack Compose 기반 Android BLE 테스트 앱은 `android/` 폴더에 있습니다.

- Android Studio에서 `android/` 폴더 열기
- BLE 기기 검색 및 기기 ID 자동 매칭
- Device ID / Protocol Version / Device Status 읽기
- Telemetry Notify 및 40바이트 V1.0 패킷 확인

자세한 실행 방법은 [Android README](android/README.md)를 참고하세요. 현재 실제 ESP32-S3 하드웨어 연결 테스트는 보드 준비 후 진행해야 합니다.
