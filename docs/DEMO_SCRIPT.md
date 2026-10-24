# Network Diagnostics Suite — guion de demostración

Este recorrido se basa en resultados observados en el emulador Android. Los equipos, contadores y estados dependen de los datos existentes durante la grabación; no se deben presentar valores preparados como mediciones en vivo.

## Preparación

1. Iniciar el backend local desde `backend` con `npm start`. Instalar sus dependencias con `npm install` si aún no están disponibles.
2. Iniciar Metro desde `app` con `npm start` y abrir la aplicación en el emulador. Para recompilarla, ejecutar `npm run android` desde `app`.
3. Comprobar la conexión del emulador con el backend mediante `10.0.2.2`. Esa dirección representa al equipo anfitrión solo desde el emulador Android; un teléfono físico necesita una dirección alcanzable en su red.
4. Comprobar previamente los permisos de cámara y ubicación, la captura fotográfica y la apertura de PDF. Si algún recurso no está disponible, mostrar el error o la ausencia de datos en vez de simular evidencia.

## Recorrido sugerido

1. **Inicio y red.** Abrir **Inicio** y señalar los valores presentes. Entrar en **Red** y ejecutar un escaneo. El resultado depende de la red; no anunciar una cantidad fija de equipos ni una puerta de enlace predeterminada.
2. **Identificación por código.** Abrir **Escaneo QR / Código**, seleccionar **Ingresar código manualmente**, escribir `HG8245W5` y pulsar **Buscar**. Mostrar la ficha del catálogo local. Para **Abrir diagnóstico SNMP**, ingresar la IP real del destino. En el laboratorio del emulador puede utilizarse `10.0.2.2` si el backend local está activo; el modelo no determina por sí solo la IP.
3. **Diagnóstico.** Mostrar la respuesta SNMP o el error real de la red. Para SSH, utilizar el destino y las credenciales configurados para la prueba; el stub local permite comprobar la ejecución. Guardar una sesión solo después de observar su salida.
4. **Instalación.** Abrir **Nueva instalación**. Seleccionar un equipo con IP válida o introducir los datos manualmente. En **Evidencia**, pulsar **Agregar foto** y **Capturar**. Comprobar que aparece la imagen capturada y que el contador corresponde a la cantidad real. Si no se obtiene ubicación, mostrar **GPS no disponible**; no atribuir coordenadas a una foto sin una lectura nueva. Ingresar notas técnicas, revisar los datos y pulsar **Guardar y generar PDF**.
5. **Reporte.** Verificar que **Reporte de instalación** muestra el PDF de ese registro, incluidas únicamente las fotos y notas ingresadas. **Abrir PDF** utiliza un visor externo disponible en el dispositivo. **Guardar en Descargas** confirma éxito solo después de copiar el archivo; verificarlo en Descargas. El reporte también puede abrirse desde **Instalaciones** o **Historial** cuando el archivo local existe.
6. **Sincronización.** Abrir **Cola de sincronización** y observar el estado del registro. Con el backend disponible, ejecutar la sincronización y verificar el estado resultante. En una prueba, el nuevo registro mostró un conflicto de versión; **Mantener mía** resolvió el conflicto y el estado pasó a **Sincronizado**. No asumir que todos los registros se sincronizarán de inmediato. Para mostrar el modo sin conexión, desconectar el emulador, crear un registro, comprobar que queda pendiente y recuperar la red.
7. **Persistencia.** Visitar **Historial** e **Instalaciones** para mostrar los registros guardados. Cerrar y volver a abrir la aplicación; esperar la carga de SQLite y comprobar que los datos continúan disponibles.

## Límites

- La ficha manual `HG8245W5`, SNMP y SSH contra `10.0.2.2`, la captura real, la vista previa del PDF y la exportación a Descargas se probaron en este emulador. Repetir la comprobación antes de grabar.
- La posición GPS depende de los permisos y de una lectura del dispositivo; no hay coordenadas garantizadas para la demostración.
- No existe un botón **Simular Conflicto (409)** en la cola. La resolución solo debe mostrarse si aparece un conflicto real.
- La acción de compartir un PDF como archivo adjunto no está implementada. La aplicación permite abrirlo en un visor externo y guardarlo en Descargas.
