# Network Diagnostics Suite — Mobile Application (`app/`)

This directory contains the **React Native Android Mobile Application** for the Network Diagnostics Suite.

- **Package Name:** `com.fcyt.netdiag`
- **React Native Version:** 0.87.1 (Bare CLI)
- **Architecture:** React Native New Architecture (Fabric + TurboModules enabled)
- **Target OS:** Android (API 24 to 35)

---

## 1. Directory Structure

- `src/components/`: Reusable UI kit components styled with the custom dark telemetry design palette (`#071425`).
- `src/navigation/`: Bottom tab navigator (5 tabs: Inicio, Red, Instala., Historial, Ajustes) and root stack navigation.
- `src/protocols/`: Pure TypeScript ASN.1 / BER codec, SNMP v1/v2c PDU builder/parser, UDP client, and SSH service.
- `src/security/`: `CredentialManager` wrapping `react-native-keychain` and Android Keystore.
- `src/services/`: Subnet calculator, concurrent discovery engine, GPS location service, QR device catalog cache, and HTML-to-PDF report generator.
- `src/store/`: SQLite DDL schema, migrations, and repository layer (`@op-engineering/op-sqlite`).
- `src/sync/`: `SyncWorker` implementing the Outbox pattern, exponential backoff, and NetInfo connectivity triggers.
- `src/theme/`: Telemetry color palette, typography tokens, and spacing constants.
- `__tests__/`: Jest unit test suites for all domain modules.

---

## 2. Running Locally

### Install Dependencies
```bash
npm install
```

### Run Unit Tests
```bash
npm test
```

### Type-Check
```bash
npx tsc --noEmit
```

### Start Metro Dev Server
```bash
npm start
```

### Build & Deploy on Android
```bash
npm run android
```

### Build Production / Debug APK via Gradle
```bash
cd android
./gradlew assembleDebug
# Output binary: android/app/build/outputs/apk/debug/app-debug.apk
```
