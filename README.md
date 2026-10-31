# Documentación e instalación

## Compatibilidad

El proyecto ha sido probado en sistemas operativos **Windows**.

## Tecnologías utilizadas

- **PHP 8.2 o superior:** ejecución del servidor.
- **Ratchet:** biblioteca PHP utilizada para implementar la comunicación mediante WebSockets.
- **JavaScript:** lógica del cliente y comunicación con el servidor.
- **HTML5:** estructura de la interfaz.
- **CSS3:** diseño y estilos.

---

## 1. Instalar PHP

Instalar PHP 8.2 o una versión superior.

Descargar PHP para Windows desde el siguiente enlace:

[Descargar PHP 8.2.35 (Windows x64)](https://downloads.php.net/~windows/releases/archives/php-8.2.35-1-nts-Win32-vs16-x64.zip)

Una vez descargado, configurar PHP en el sistema y verificar que esté disponible desde la terminal:

```bash
php -v
```

## 2. Iniciar el servidor WebSocket

Abrir una terminal de Windows y acceder al directorio del proyecto donde se encuentra el archivo `servidor_socket.php`.

Ejecutar el siguiente comando:

```bash
php servidor_socket.php
```

Esto iniciará el servidor WebSocket, que utilizará el puerto `30400`.

## 3. Configurar la conexión WebSocket en modo local

Acceder a la carpeta `plugin_temas` y abrir el archivo:

```text
background.js
```

Localizar la sección correspondiente a **TRANSMISIÓN POR WEBSOCKET** y configurar la dirección del servidor para trabajar en modo local:

```javascript
const socket = new WebSocket("ws://127.0.0.1:30400");
```

Guardar los cambios.

## 4. Configurar el acceso remoto mediante un túnel

Para permitir conexiones desde redes externas, es necesario utilizar un servicio de túnel que exponga el puerto del servidor WebSocket a Internet.

Existen diferentes alternativas, como Cloudflare Tunnel y Microsoft Dev Tunnels.

En esta documentación utilizaremos **Microsoft Dev Tunnels**.

### 4.1. Instalar Microsoft Dev Tunnels

Abrir una terminal de Windows y ejecutar:

```bash
winget install Microsoft.devtunnel
```

### 4.2. Iniciar sesión

Microsoft Dev Tunnels permite autenticarse utilizando una cuenta de GitHub o Microsoft.

**Autenticación mediante GitHub:**

```bash
devtunnel user login -g
```

**Autenticación mediante Microsoft:**

```bash
devtunnel user login
```

### 4.3. Crear un túnel público

Ejecutar el siguiente comando para exponer el puerto `30400`:

```bash
devtunnel host -p 30400 --allow-anonymous
```

**Importante:** El parámetro `--allow-anonymous` permite que los clientes externos se conecten al túnel sin autenticarse previamente con una cuenta de Microsoft o GitHub.

Al iniciar el túnel, Dev Tunnels proporcionará una dirección pública que permitirá acceder al servicio desde Internet.

### 4.4. Configurar la conexión remota

Volver a la carpeta `plugin_temas` y abrir el archivo `background.js`.

En la sección **TRANSMISIÓN POR WEBSOCKET**, reemplazar la dirección local por la dirección pública correspondiente al túnel:

```javascript
const socket = new WebSocket("wss://URL-DEVTUNNEL");
```

Reemplazar `URL-DEVTUNNEL` por la dirección asignada por Microsoft Dev Tunnels.

Guardar los cambios.

## 5. Instalar la extensión del navegador

Instalar la carpeta `plugin_temas` como extensión en el navegador.

El proyecto es compatible con navegadores basados en Chromium, entre ellos:

- Google Chrome.
- Microsoft Edge.
- Brave.

Para instalarla, acceder a la sección de administración de extensiones del navegador, activar el modo de desarrollador y seleccionar **Cargar extensión sin empaquetar**. Finalmente, seleccionar la carpeta `plugin_temas`.

## 6. Consideraciones de seguridad

- No mantener el túnel público activo cuando no se esté utilizando.
- Detener Microsoft Dev Tunnels al finalizar las pruebas.

**Recomendación:** utilizar el modo local durante las pruebas y habilitar el acceso remoto únicamente cuando sea necesario.

---

## ¡Instalación completada!

Una vez realizados los pasos anteriores, el servidor WebSocket y la extensión estarán configurados para funcionar en modo local o remoto, según la configuración seleccionada.




