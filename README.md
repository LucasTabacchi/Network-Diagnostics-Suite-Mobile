# Network Diagnostics Suite (TP6)

**Licenciatura en Sistemas de Información** — Facultad de Ciencia y Tecnología (FCyT), Sede Concepción del Uruguay  
**Cátedra:** Desarrollo de Aplicaciones Móviles — Ciclo Lectivo 2026  
**Trabajo Práctico N° 6:** Toolkit móvil de diagnóstico de infraestructura de telecomunicaciones para técnicos de campo  

---

## 1. Resumen del Proyecto

La **Network Diagnostics Suite** es una aplicación móvil desarrollada en **React Native (Bare CLI, New Architecture)** diseñada como herramienta de campo para técnicos que instalan y mantienen infraestructura de telecomunicaciones (ONTs de fibra óptica, routers troncales, switches gestionables y enlaces inalámbricos punto a punto).

Operando en entornos con conectividad nula o intermitente (sitios remotos, azoteas, gabinetes urbanos, salas de servidores), la aplicación implementa una arquitectura **offline-first con cola de sincronización diferida (Outbox Pattern)**, comunicación de bajo nivel sobre **sockets directos TCP/UDP**, consultas **SNMP v1/v2c con codec BER propio**, consola **SSH remota con comandos predefinidos por vendor**, escáner **QR con catálogo offline de especificaciones**, georreferenciación de evidencia y generación de **reportes de instalación en formato PDF**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NETWORK DIAGNOSTICS SUITE ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ PRESENTATION ]  Inicio · Red (LAN) · Instalaciones · Historial · Ajustes │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ PROTOCOLS ]     SNMP v1/v2c (BER Codec) · SSH Terminal · Zeroconf mDNS   │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ EVIDENCE ]      VisionCamera QR/Barcode · GPS Coordinates · HTML-to-PDF  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ STORAGE ]       SQLite (op-sqlite) · Hardware Keystore (Keychain)        │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ SYNC LAYER ]    Outbox Queue · Exponential Backoff · 409 Conflict UI    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estructura del Repositorio

```
tp_6/
├── app/                                 # Aplicación Móvil React Native (Android)
│   ├── android/                         # Proyecto nativo Gradle / Android Studio
│   │   └── app/build/outputs/apk/debug/ # APK compilada (app-debug.apk)
│   ├── src/
│   │   ├── components/                  # UI Kit (StatusHeader, Card, ActionButton, Badge, Icon)
│   │   ├── navigation/                  # BottomTabs (5 pestañas) & RootStack
│   │   ├── protocols/                   # Codec ASN.1/BER, cliente SNMP UDP, servicio SSH
│   │   ├── security/                    # CredentialManager (Android Keystore / Keychain)
│   │   ├── services/                    # Discovery, Subnet, GPS, DeviceCache, PDF Report
│   │   ├── store/                       # SQLite schema DDL, migraciones y repositorios
│   │   ├── sync/                        # SyncWorker (Outbox, Exponential Backoff, ConflictStore)
│   │   └── theme/                       # Paleta oscura de telemetría y tipografía (DESIGN.md)
│   └── __tests__/                       # Suites de pruebas unitarias Jest (44 tests)
├── backend/                             # Backend stub de sincronización (Node.js / Express)
│   ├── server.js                        # Endpoints: POST /sync/push, GET /sync/pull, GET /health
│   └── package.json
├── docs/                                # Documentación Técnica y Demostración
│   ├── TECHNICAL_REPORT.md              # Reporte de Arquitectura, SNMP, Seguridad y Outbox
│   └── DEMO_SCRIPT.md                   # Guía de evaluación paso a paso para video demo
├── odd/                                 # Organic Driven Development (Tracking de tareas)
│   └── tasks/tp6-network-diagnostics.md
├── TP6_Network_Diagnostics_Suite.md     # Enunciado original de la cátedra
└── README.md                            # Guía principal de instalación y ejecución
```

---

## 3. Requisitos Previos

- **Node.js:** Versión 18 LTS o superior.
- **npm:** Versión 9 o superior (incluido con Node.js).
- **JDK:** Java Development Kit 17 (Eclipse Temurin o OpenJDK 17).
- **Android SDK:**
  - `compileSdkVersion`: 35
  - `targetSdkVersion`: 34
  - `minSdkVersion`: 24 (Android 7.0+)
  - `buildToolsVersion`: 35.0.0
  - `NDK`: 26.1.10909125 o superior (requerido para C++ CMake de React Native New Architecture).
- **Dispositivo / Emulador:** Dispositivo físico Android conectado por USB con depuración habilitada o Emulador Android Studio con puente de red LAN.

---

## 4. Guía de Instalación y Puesta en Marcha

### Paso 1: Clonar el Repositorio y Verificar Rama
```bash
git clone <url-del-repositorio>
cd tp_6
git checkout feat/tp6-network-diagnostics
```

### Paso 2: Iniciar el Servidor de Sincronización (Backend Stub)
En una terminal dedicada:
```bash
cd backend
npm install
npm start
```
*Salida esperada:*
```
[Sync Server] Listening on http://0.0.0.0:3000
[Sync Server] Ready to receive batch syncs on POST /sync/push
```

### Paso 3: Ejecutar las Pruebas Unitarias
En una segunda terminal, validar que todos los módulos de dominio, codec SNMP y base de datos pasen limpiamente:
```bash
cd app
npm test
```
*Salida esperada:*
```
PASS __tests__/installation.test.ts
PASS __tests__/snmp.test.ts
PASS __tests__/credentials_ssh.test.ts
PASS __tests__/store.test.ts
PASS __tests__/evidence.test.ts
PASS __tests__/sync.test.ts
PASS __tests__/discovery.test.ts
PASS __tests__/App.test.tsx

Test Suites: 8 passed, 8 total
Tests:       44 passed, 44 total
```

### Paso 4: Iniciar el Metro Bundler
```bash
cd app
npm start
```

### Paso 5: Compilar y Ejecutar en Android
En una tercera terminal:
```bash
cd app
npm run android
```

#### Alternativa: Instalación directa del APK compilado
Si ya dispones de la APK compilada:
```bash
adb install app/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Resumen de Características Técnicas Destacadas

1. **Cliente SNMP Nativo en TypeScript:**
   - Implementación pura de **ASN.1 / BER (Basic Encoding Rules)**: codificación y decodificación de `INTEGER`, `OCTET STRING`, `NULL`, `OBJECT IDENTIFIER` (base-128), `SEQUENCE`, `Counter32`, `Counter64`, `Gauge32` y `TimeTicks`.
   - Transmisión de paquetes `GetRequest` y recepción de `GetResponse` sobre sockets crudos UDP (puerto 161) vía `react-native-udp`.
   - Consulta de variables estándar de MIB-II: `sysDescr`, `sysUpTime`, `sysName`, `ifInOctets`, `ifOutOctets`, `ifOperStatus` y `ifPhysAddress` (MAC real).

2. **Seguridad de Credenciales con Hardware Keystore:**
   - Cero almacenamiento de contraseñas o claves privadas en SQLite ni en texto plano.
   - Almacenamiento seguro en el enclave criptográfico del dispositivo (**Android Keystore**) vía `react-native-keychain`.
   - SQLite solo almacena identificadores opacos y metadatos no sensibles (`keychain_ref`).
   - Servicio SSH con presets de comandos por fabricante (MikroTik RouterOS, Cisco IOS, Huawei VRP, Ubiquiti EdgeOS).

3. **Arquitectura Offline-First con Outbox Pattern:**
   - Base de datos relacional local SQLite ultrarrápida vía `@op-engineering/op-sqlite`.
   - Cola de salida persistida con máquina de estados (`pending`, `syncing`, `synced`, `failed`, `conflict`).
   - Algoritmo de **backoff exponencial truncado** (2s, 4s, 8s... hasta 5 minutos) con jitter aleatorio.
   - Detección reactiva de reconexión mediante `@react-native-community/netinfo` para auto-sincronización.
   - Interfaz visual de **resolución de conflictos (HTTP 409)** comparando lado a lado la versión local frente a la del servidor ("Mantener mía" vs "Usar servidor").

4. **Evidencia Técnica y Generación de PDF:**
   - Escáner de códigos QR y de barras con VisionCamera y resolución instantánea contra catálogo de fichas técnicas offline.
   - Georreferenciación GPS de alta precisión con validación de exactitud y fallback de campus.
   - Generación de reportes de instalación profesionales en PDF de hoja blanca de alta densidad con metadatos técnicos, telemetría óptica/RF, matriz fotográfica con geolocalización y caja de firmas.

---

## 6. Documentos de Referencia

- 📘 [Reporte Técnico de Arquitectura (`docs/TECHNICAL_REPORT.md`)](docs/TECHNICAL_REPORT.md) — Análisis detallado de diseño de capas, matemática de subredes, protocolo SNMP, seguridad y sincronización.
- 🎬 [Guía de Demostración y Video Script (`docs/DEMO_SCRIPT.md`)](docs/DEMO_SCRIPT.md) — Guion estructurado paso a paso para la evaluación y grabación de la demo técnica.
