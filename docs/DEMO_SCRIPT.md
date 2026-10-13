# Network Diagnostics Suite — Guion de Demostración y Grabación de Video

**Licenciatura en Sistemas de Información** — Facultad de Ciencia y Tecnología (FCyT), Sede Concepción del Uruguay  
**Desarrollo de Aplicaciones Móviles — 2026**  
**Proyecto:** Network Diagnostics Suite (TP6)  
**Entregable:** Guía de Demostración del Flujo de Trabajo del Técnico de Campo  

---

## 1. Resumen y Objetivos de la Demostración

Este guion guía al evaluador o demostrador a través de un flujo de trabajo integral de un técnico de telecomunicaciones en campo. Cumple directamente con los requisitos de la **Sección 7 del enunciado del TP6**:
1. Descubrimiento de equipos activos en la red local (LAN / mDNS).
2. Consulta de telemetría SNMP en vivo (tiempo de actividad, descripción del sistema, contadores de ancho de banda en interfaces).
3. Ejecución de comandos de diagnóstico remoto vía SSH sobre equipamiento de telecomunicaciones.
4. Escaneo de códigos QR/barras para inventario y consulta de ficha técnica.
5. Registro de instalación técnica con georreferenciación GPS y evidencia fotográfica etiquetada.
6. Generación de reporte profesional en PDF y previsualización sin conexión.
7. Operación con cola de sincronización fuera de línea (Outbox), sincronización automática al recuperar conectividad y resolución de conflictos.

---

## 2. Configuración del Entorno

### 2.1 Iniciar el Servidor Stub de Sincronización
En una terminal, iniciar el backend mínimo de sincronización:
```bash
cd tp_6/backend
npm install
npm start
```
*Salida en consola:* `[Sync Server] Listening on http://0.0.0.0:3000`

### 2.2 Iniciar Metro Bundler y Ejecutar la Aplicación
En una segunda terminal:
```bash
cd tp_6/app
npm start
```
Ejecutar en un dispositivo Android físico o en un emulador con puente de red local:
```bash
npm run android
# O instalar el APK generado directamente:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. Recorrido Paso a Paso del Técnico de Campo

### Escena 1: Panel Principal y Telemetría Inicial (Pestaña: "Inicio")
- **Acción:** Abrir la aplicación.
- **Elementos visuales:** Observar el tema oscuro de telemetría (`#071425`), el encabezado de estado con selector de sitio ("Sitio: Nodo Centro") y el distintivo de conectividad en tiempo real ("Modo Offline / Online").
- **Métricas clave:**
  - Métricas de resumen de estado (Equipos Activos: `8`, Alertas Críticas: `1`, Pendientes Sync: `2`, Enlaces Operativos: `4`).
  - Tarjeta de Alerta Activa ("Baja Potencia Óptica - Nodo Centro ONT-03").
  - Botones de acción rápida: **Escanear Red**, **Nueva Instalación**, **Consola SSH**, **Sincronizar**.

---

### Escena 2: Descubrimiento en Red Local (Pestaña: "Red")
- **Acción:** Tocar la pestaña **Red** o el botón de acción rápida "Escanear Red".
- **Ejecución:**
  1. La tarjeta superior muestra la IP local detectada (`192.168.1.100/24`) y la puerta de enlace (`192.168.1.1`).
  2. Tocar **"Iniciar Escaneo"**.
  3. La barra de progreso animada avanza mientras el motor `DiscoveryEngine` coordina barridos concurrentes de puertos TCP (`22`, `80`, `443`, `8291`) y escuchas mDNS.
  4. Los dispositivos activos se listan con distintivos del fabricante, direcciones IP, puertos abiertos y latencia de respuesta.
- **Punto técnico a destacar:** Explicar que Android 10+ restringe la lectura directa de la tabla ARP del sistema, por lo que la suite utiliza sondeo de puertos TCP/UDP y consultas SNMP a `ifPhysAddress` para determinar la identidad de los equipos activos.

---

### Escena 3: Consulta de Telemetría SNMP en Vivo (Pantalla: "Detalle de Equipo")
- **Acción:** Seleccionar cualquier router u ONT de la lista (por ejemplo, `192.168.1.1 - Router Principal MikroTik`).
- **Ejecución:**
  1. La pantalla carga los metadatos del equipo y abre la pestaña **SNMP Telemetría**.
  2. Tocar **"Consultar Telemetría SNMP"**.
  3. El códec ASN.1 / BER implementado en TypeScript puro construye un paquete SNMPv2c `GetRequest` y lo transmite por el puerto UDP 161.
  4. La respuesta del equipo actualiza la interfaz en tiempo real:
     - **sysDescr:** `RouterOS v7.14 (hAP ac2)`
     - **sysUpTime:** `14d 06h 22m`
     - **sysName:** `RTR-CENTRO-01`
     - **ifInOctets / ifOutOctets:** Contadores de ancho de banda e indicadores de estado de interfaces en vivo.
- **Punto técnico a destacar:** Resaltar que el códec BER de SNMP está desarrollado al 100% en TypeScript puro, sin depender de librerías nativas externas de C o Java.

---

### Escena 4: Consola de Diagnóstico Remoto SSH (Pantalla: "Consola SSH")
- **Acción:** Navegar a **Ajustes** $\rightarrow$ **Gestión de Credenciales** $\rightarrow$ seleccionar un perfil de equipo y abrir la **Consola SSH**.
- **Ejecución:**
  1. La terminal muestra el indicador del dispositivo conectado: `admin@192.168.1.1:22`.
  2. Utilizar la barra de herramientas de comandos predefinidos por fabricante (ejemplo: MikroTik):
     - Tocar `/system resource print`: La terminal muestra la carga de CPU, memoria libre y versión de firmware.
     - Tocar `/interface print stats`: Se visualizan los contadores de paquetes y errores en tiempo real.
  3. Tocar **"Guardar en Diagnósticos"**: Almacena la salida directamente en SQLite para consulta fuera de línea.
- **Punto técnico a destacar:** Enfatizar que las contraseñas y claves privadas SSH se resguardan exclusivamente en el **Android Hardware Keystore** mediante `react-native-keychain` y nunca se almacenan en SQLite ni en texto plano.

---

### Escena 5: Identificación de Equipos por Código QR (Pantalla: "Escaneo QR")
- **Acción:** Tocar el icono flotante de QR o ingresar mediante **Nueva Instalación** $\rightarrow$ "Escanear QR".
- **Ejecución:**
  1. La cámara se inicia con una mira de escaneo superpuesta.
  2. Escanear el código del equipo o tocar **"Ingresar Código Manualmente"** e ingresar: `HUAW-ONT-HG8245H-9921`.
  3. `DeviceSheetCache` contrasta el código con el catálogo fuera de línea y despliega la ficha técnica completa:
     - **Modelo:** Huawei EchoLife HG8245H GPON ONT
     - **Puertos:** 4 GE + 2 POTS + Wi-Fi b/g/n
     - **Rango Óptico Óptimo:** -8 dBm a -27 dBm
  4. Tocar **"Iniciar Instalación con este Equipo"**.

---

### Escena 6: Asistente Técnico de Instalación (Pestaña: "Instala." $\rightarrow$ "Nueva Instalación")
- **Acción:** Completar el asistente de 4 pasos:
  1. **Paso 1: Identificación:** Seleccionar el Sitio ("Nodo Centro") y el Equipo ("Huawei EchoLife HG8245H"). Tocar **"Siguiente: Evidencia"**.
  2. **Paso 2: Evidencia de Campo:**
     - Tocar **"Capturar Gabinete"**: Se toma la fotografía de evidencia y se etiqueta con coordenadas GPS (`-32.4825, -58.2321`) y marca de tiempo.
     - Tocar **"Capturar Empalme Óptico"**: Captura la bandeja interna de fibra.
     - Tocar **"Capturar Nivel de Señal"**: Captura la lectura del medidor de potencia.
     - Tocar **"Siguiente: Notas"**.
  3. **Paso 3: Notas Técnicas:**
     - Ingresar Técnico: `Téc. M. Gómez`.
     - Potencia Óptica: `-19.4 dBm`.
     - Relación Señal/Ruido (SNR): `32.5 dB`.
     - Observaciones: `Instalación completada con conector SC/APC verde. Pérdida óptica dentro de la norma técnica.`.
     - Tocar **"Siguiente: Revisión"**.
  4. **Paso 4: Revisión y Cierre:**
     - Revisar el resumen estructurado de la instalación.
     - Tocar **"Finalizar y Generar Reporte PDF"**.
- **Resultado visual:** La aplicación compila el reporte, almacena la instalación en SQLite, encola la tarea en la cola Outbox y navega a la pantalla de vista previa del PDF.

---

### Escena 7: Generación de Reporte PDF y Vista Previa Offline (Pantalla: "Visor de Reporte PDF")
- **Acción:** Inspeccionar en pantalla el documento técnico generado.
- **Elementos visuales:**
  - Diseño profesional en formato de hoja técnica blanca con cabecera de telecomunicaciones.
  - UUID único de verificación del documento y sello QR.
  - Tabla de especificaciones técnicas del hardware.
  - Indicadores de telemetría óptica (Potencia Rx: `-19.4 dBm`, SNR: `32.5 dB`).
  - Matriz fotográfica de evidencia a dos columnas con coordenadas y fecha superpuestas.
  - Estado de sincronización: **"En cola para sincronizar"** (modo sin conexión).
  - Botones de acción flotantes: **Compartir** y **Descargar**.

---

### Escena 8: Cola Outbox y Sincronización al Recuperar Conectividad (Pantalla: "Cola de Sincronización")
- **Acción:** Activar el Modo Avión en el dispositivo o emulador (sin conexión).
- **Ejecución:**
  1. Navegar a **Ajustes** $\rightarrow$ **Cola de Sincronización (Outbox)**.
  2. Observar el banner amarillo persistente: `"Sin conexión a internet. Los cambios se guardan localmente y se sincronizarán automáticamente al reconectar."`
  3. El listado muestra el reporte de instalación pendiente con estado `PENDIENTE`.
  4. **Restablecer la Conectividad** (Desactivar Modo Avión).
  5. El observador `@react-native-community/netinfo` detecta la disponibilidad de red.
  6. El componente `SyncWorker` se activa de forma automática:
     - El estado del elemento transiciona de `PENDIENTE` $\rightarrow$ `SINCRONIZANDO` $\rightarrow$ `SINCRONIZADO` (indicador verde).
  7. Verificar la terminal del backend: se observa `[Sync Server] Batch sync received: 1 items processed successfully.`

---

### Escena 9: Resolución de Conflictos de Sincronización (Pantalla: "Resolución de Conflictos")
- **Acción:** Ejecutar una simulación de conflicto.
- **Ejecución:**
  1. Tocar **"Simular Conflicto (409)"** en la pantalla de la cola de sincronización.
  2. El servidor responde con HTTP 409 Conflict.
  3. El elemento de la cola cambia su estado a `CONFLICTO` con icono de advertencia.
  4. Tocar el elemento para abrir la pantalla **SyncConflictScreen**:
     - Columna izquierda: **Versión Local** (Modificaciones recientes del técnico en campo).
     - Columna derecha: **Versión del Servidor** (Registro en conflicto en la base de datos central).
     - Tocar **"Mantener mi versión"**: Fuerza la sobrescritura con la información local.
     - El conflicto queda resuelto y la cola se sincroniza con éxito.

---

### Escena 10: Historial de Diagnósticos e Instalaciones (Pestaña: "Historial")
- **Acción:** Tocar la pestaña **Historial**.
- **Ejecución:**
  1. La pantalla carga todos los registros históricos de diagnósticos e instalaciones directamente desde SQLite (100% fuera de línea).
  2. Probar los filtros por categoría: **Todos**, **SNMP**, **SSH**, **Instalación**.
  3. Utilizar la barra de búsqueda ingresando `Huawei` o `192.168.1.1` para filtrar elementos al instante.
  4. Seleccionar un registro de instalación para volver a abrir la vista previa de su reporte PDF generado.

---

## 4. Cuadro Resumen de Evidencias de Evaluación

| Funcionalidad | Evidencia Demostrada |
|---|---|
| Descubrimiento LAN | Barrido interactivo sobre subred con listado de equipos activos y puertos abiertos |
| Protocolo SNMP | Códec BER puro en TypeScript consultando OIDs de MIB-II vía sockets UDP/161 |
| Consola SSH | Presets de comandos por fabricante (MikroTik, Cisco, Huawei) con ejecución en vivo |
| Seguridad por Hardware | Aislamiento en Android Keystore vía Keychain, sin contraseñas en texto plano en la BD |
| Evidencia de Campo | Resolución de fichas técnicas por QR, georreferenciación GPS y matriz fotográfica |
| Reportes en PDF | Documento técnico formal con UUID de verificación generado en el dispositivo |
| Cola Offline Outbox | Patrón Outbox con backoff exponencial, detección por NetInfo y resolución de conflictos 409 |
| Historial Local | Consultas directas sobre SQLite con agrupación por fecha y filtrado multicategoría |
