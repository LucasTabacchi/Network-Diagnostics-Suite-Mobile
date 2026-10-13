# Network Diagnostics Suite

**Licenciatura en Sistemas de Información** — FCyT, Sede Concepción del Uruguay
**Desarrollo de Aplicaciones Móviles — 2026**

*Toolkit móvil de diagnóstico de infraestructura de telecomunicaciones para técnicos de campo*

- **Área temática:** Comunicaciones y Redes de Datos
- **Tecnología:** React Native

> Nota: este documento es una transcripción en Markdown del enunciado original (PDF). Los tres diagramas de la sección 6 son imágenes en el original y aquí se describen en texto.

---

## 1. Introducción y contexto

Este trabajo práctico propone el desarrollo de una aplicación móvil en React Native pensada como herramienta de campo para técnicos que instalan y mantienen infraestructura de telecomunicaciones (ONTs, routers, antenas, switches). La aplicación debe permitir descubrir dispositivos en la red local, consultar información básica de equipos mediante protocolos de red de bajo nivel, ejecutar diagnósticos remotos vía SSH y generar reportes de instalación offline-first.

El proyecto exige trabajar directamente sobre sockets TCP/UDP, sin las abstracciones HTTP habituales, e implementar una arquitectura robusta de sincronización diferida, dado que gran parte del escenario de uso (sitios de instalación remotos, azoteas, gabinetes) tiene conectividad nula o intermitente.

---

## 2. Objetivos

### 2.1 Objetivo general

Desarrollar una suite de diagnóstico de red offline-first para técnicos de campo, capaz de descubrir equipos en la LAN, consultar su estado mediante protocolos de gestión de red y documentar instalaciones con evidencia georreferenciada.

### 2.2 Objetivos específicos

- Descubrir dispositivos activos en la red local mediante escaneo ARP y/o mDNS/Bonjour.
- Implementar un cliente SNMP simplificado para consultar OIDs básicos (uptime, tráfico de interfaces, nombre de sistema).
- Integrar un cliente SSH embebido para ejecutar comandos de diagnóstico predefinidos sobre equipos de red.
- Identificar equipos mediante escaneo de códigos QR/barras y asociarlos a fichas técnicas.
- Generar reportes de instalación en PDF con evidencia fotográfica georreferenciada.
- Garantizar operación offline-first con cola de sincronización diferida.

---

## 3. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Escanear la red local y listar dispositivos activos (IP, MAC, hostname si disponible) | Alta |
| RF-02 | Consultar vía SNMP: uptime, sysName, tráfico de interfaces de un dispositivo objetivo | Alta |
| RF-03 | Conectarse vía SSH a un equipo y ejecutar un set de comandos de diagnóstico predefinidos | Alta |
| RF-04 | Escanear código QR/barras de un equipo y asociarlo a una ficha técnica remota | Media |
| RF-05 | Registrar una instalación con fotos, ubicación GPS y notas técnicas | Alta |
| RF-06 | Generar un reporte PDF de instalación a partir de los datos registrados | Media |
| RF-07 | Operar completamente offline y encolar acciones (reportes, syncs) para cuando haya conectividad | Alta |
| RF-08 | Historial de diagnósticos por equipo/sitio, consultable sin conexión | Media |

---

## 4. Requisitos técnicos y stack sugerido

### 4.1 Descubrimiento y protocolos de red

- `react-native-zeroconf` — descubrimiento de dispositivos vía mDNS/Bonjour.
- `react-native-udp` + `react-native-tcp-socket` — base para escaneo ARP-like sobre la subred y construcción manual de paquetes SNMP (GetRequest) sobre UDP/161.
- Parser propio de PDUs SNMP v1/v2c (BER/ASN.1 simplificado) para decodificar las respuestas de OIDs estándar (`1.3.6.1.2.1.1.x` del MIB-II).

### 4.2 Acceso remoto

- `react-native-ssh-sftp` — cliente SSH embebido para ejecución de comandos predefinidos (show interfaces, uptime, etc. según el vendor).
- Manejo seguro de credenciales de equipos: nunca persistir contraseñas en texto plano (usar Keychain/Keystore vía `react-native-keychain`).

### 4.3 Identificación y evidencia

- `react-native-vision-camera` + un modelo de detección de códigos (`vision-camera-code-scanner` o ML Kit) para QR/barcode.
- `react-native-html-to-pdf` — generación de reportes de instalación en PDF.
- `react-native-geolocation-service` — georreferenciación de fotos y del reporte.

### 4.4 Offline-first y sincronización

- WatermelonDB — base local reactiva con soporte nativo de sincronización diferida.
- Cola de acciones pendientes (outbox pattern) persistida localmente, con reintentos y resolución de conflictos básica al reconectar.
- `@react-native-community/netinfo` — disparo de sincronización automática al recuperar conectividad.

---

## 5. Arquitectura propuesta

| Capa | Responsabilidad | Tecnología |
|---|---|---|
| Discovery Layer | Escaneo de LAN, mDNS, resolución de dispositivos activos | react-native-zeroconf, UDP/TCP sockets |
| Protocol Layer | Cliente SNMP (PDU propio) y cliente SSH | sockets UDP/TCP, react-native-ssh-sftp |
| Evidence Layer | Captura de fotos, QR/barcode, geolocalización | vision-camera, geolocation-service |
| Local Store | Persistencia offline-first de equipos, diagnósticos y reportes | WatermelonDB |
| Sync Layer | Cola de sincronización diferida (outbox) hacia backend | NetInfo + cola persistida |
| Reporting Layer | Generación de PDF de instalación con evidencia | react-native-html-to-pdf |

El punto arquitectónico más delicado es el manejo de protocolos binarios (SNMP) sobre sockets crudos en un entorno móvil, algo para lo que el ecosistema JS no tiene librerías maduras listas para usar en React Native. Se recomienda implementar un subconjunto mínimo del protocolo (GetRequest/GetResponse sobre community strings, sin autenticación SNMPv3) y documentar explícitamente el alcance y las limitaciones de seguridad de ese enfoque.

---

## 6. Diagramas

Esta sección ilustra la arquitectura de capas de la aplicación, los casos de uso que cubre desde la perspectiva del técnico de campo y del sistema, y el flujo de trabajo típico de una visita de instalación o diagnóstico, desde el escaneo de la red hasta la sincronización final de los datos relevados.

### 6.1 Diagrama de arquitectura

El diagrama muestra la organización en capas descrita en la sección 5: la capa de presentación consume seis capas de dominio (descubrimiento, protocolo, evidencia, almacenamiento local, sincronización y reporting), que a su vez interactúan con tres sistemas externos: la red local de equipos, el almacenamiento seguro de credenciales y el backend de sincronización.

**Figura 1. Diagrama de arquitectura en capas de Network Diagnostics Suite** *(descripción textual de la imagen)*

**Capa de presentación (UI React Native):** Listado de equipos · Consola de diagnóstico · Escáner QR · Formulario de instalación · Historial.

**Capas de negocio / dominio:**

| Capa | Contenido indicado en el diagrama |
|---|---|
| Discovery Layer | Escaneo LAN · mDNS/Bonjour · resolución de hosts activos |
| Protocol Layer | Cliente SNMP (PDU propio UDP) · Cliente SSH |
| Evidence Layer | Cámara QR/Barcode · Fotos · Geolocalización |
| Local Store | WatermelonDB · modelo offline-first |
| Sync Layer | Cola outbox · NetInfo · reintentos |
| Reporting Layer | Generación de reportes PDF con evidencia georreferenciada |

**Sistemas externos:**

| Sistema | Contenido |
|---|---|
| Red Local (LAN) | Routers · ONTs · Switches · Antenas (SNMP/SSH) |
| Almacenamiento Seguro | Keychain / Keystore — credenciales SSH/SNMP |
| Backend de Sincronización | API de recepción de reportes y estado de equipos |

**Relaciones principales:**

- La capa de presentación consume Discovery, Protocol, Evidence, Local Store y Sync.
- Discovery Layer → Red Local (LAN).
- Protocol Layer → Red Local (LAN), y hacia Almacenamiento Seguro (línea punteada).
- Evidence Layer y Local Store alimentan al Reporting Layer.
- Reporting Layer → Backend de Sincronización (línea punteada).
- Sync Layer → Backend de Sincronización.

**Referencias del diagrama:** capa de presentación (UI); capas de negocio/dominio (discovery, protocolo, evidencia, store, sync, reporting); sistemas externos (red local, almacenamiento seguro, backend); flujo de datos (línea punteada: comunicación intermitente / diferida).

### 6.2 Diagrama de casos de uso

El técnico de campo es el actor principal e interactúa con la mayoría de los casos de uso de la aplicación. Dos actores secundarios completan el diagrama: el equipo de red (con el que la app dialoga vía SNMP/SSH) y el backend de sincronización (que recibe los reportes y datos encolados). Las relaciones «include» señalan casos de uso que se disparan automáticamente como parte de otro: escanear la red local incluye la consulta SNMP inicial, registrar una instalación incluye la generación del reporte PDF, y generar el reporte incluye encolarlo para su sincronización.

**Figura 2. Diagrama de casos de uso — actor principal Técnico de Campo y actores secundarios del sistema** *(descripción textual de la imagen)*

**Actores:**

- Técnico de Campo (principal)
- Equipo de Red (SNMP/SSH) (secundario)
- Backend de Sincronización (secundario)

**Casos de uso dentro del sistema "Network Diagnostics Suite (app móvil)":**

1. Escanear red local (LAN)
2. Consultar equipo vía SNMP
3. Escanear código QR / barras del equipo
4. Ejecutar diagnóstico vía SSH
5. Registrar instalación (fotos + GPS + notas)
6. Generar reporte de instalación en PDF
7. Consultar historial de diagnósticos offline
8. Encolar acciones pendientes (outbox)
9. Sincronizar datos al recuperar conectividad
10. Gestionar credenciales de equipos de forma segura

**Relaciones «include»:**

- Escanear red local (LAN) «include» Consultar equipo vía SNMP.
- Registrar instalación «include» Generar reporte de instalación en PDF.
- Generar reporte de instalación en PDF «include» Encolar acciones pendientes (outbox).
- Encolar acciones pendientes (outbox) se relaciona con Sincronizar datos al recuperar conectividad (flecha punteada).

**Asociaciones de actores:**

- El Técnico de Campo interactúa con los casos de uso de la aplicación.
- El Equipo de Red participa en Consultar equipo vía SNMP y Ejecutar diagnóstico vía SSH.
- El Backend de Sincronización participa en Sincronizar datos al recuperar conectividad.

### 6.3 Diagrama de flujo

Este diagrama detalla el ciclo operativo completo de una visita técnica: desde el escaneo inicial de la red hasta el cierre del reporte de instalación. Los rombos representan puntos de decisión clave — si el equipo fue encontrado en la red, y si hay conectividad disponible al momento de sincronizar — y las líneas punteadas indican el camino de reintento automático que toma la cola offline (outbox) cuando la sincronización no puede completarse de inmediato.

**Figura 3. Diagrama de flujo del ciclo de diagnóstico e instalación, incluyendo la ruta offline-first** *(descripción textual de la imagen)*

1. **Inicio**
2. Escanear red local (LAN / mDNS)
3. **Decisión: ¿Equipo encontrado?**
   - **No** → Reintentar / ampliar rango de escaneo → vuelve al paso 2.
   - **Sí** → continúa.
4. Identificar equipo (QR / código de barras)
5. En paralelo (ambas ramas convergen en el paso 6):
   - Consulta SNMP (uptime, tráfico)
   - Ejecutar comandos vía SSH
6. Registrar evidencia: fotos + ubicación GPS + notas
7. Persistir en base local (WatermelonDB)
8. **Decisión: ¿Hay conectividad?**
   - **No** → Encolar en cola de sincronización (outbox). Desde la cola hay un camino punteado de *reintento automático al detectar conexión (NetInfo)* hacia "Sincronizar con backend ahora".
   - **Sí** → Sincronizar con backend ahora.
9. Generar reporte de instalación en PDF (se llega desde ambas ramas)
10. **Fin**

---

## 7. Entregables

- Código fuente completo en repositorio Git.
- Build de prueba (APK) — el proyecto requiere permisos de red locales, por lo que no es compatible con Expo Go.
- Documento técnico describiendo el subset del protocolo SNMP implementado, el manejo de credenciales SSH y el diseño de la cola offline.
- Backend mínimo de sincronización (puede ser un stub simple) para validar el flujo end-to-end de la cola offline.
- Video demo mostrando: descubrimiento de al menos un dispositivo real en la LAN, consulta SNMP exitosa, generación de un reporte PDF con foto y GPS, y sincronización tras recuperar conectividad.

---

## 8. Recursos y bibliografía sugerida

- RFC 1157 — A Simple Network Management Protocol (SNMP).
- RFC 1213 — Management Information Base for Network Management of TCP/IP-based internets (MIB-II).
- Documentación de `react-native-ssh-sftp` y `react-native-udp` (GitHub).
- Martin Fowler — "Offline First" y patrón Outbox, para el diseño de la cola de sincronización.
- OWASP Mobile Application Security — lineamientos de almacenamiento seguro de credenciales.
