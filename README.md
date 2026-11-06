# 📚 Documentación e Instalación

## 🖥️ Compatibilidad
El proyecto ha sido desarrollado y probado en sistemas operativos **Windows**. La extensión es compatible con navegadores basados en **Chromium**:
* **Google Chrome**
* **Microsoft Edge**

## 🛠️ Tecnologías utilizadas

| Tecnología | Descripción |
| :--- | :--- |
| **PHP 8.2+** | Ejecución del servidor. |
| **Ratchet** | Biblioteca PHP para comunicación mediante WebSockets. |
| **JavaScript** | Lógica del cliente y comunicación con el servidor. |
| **HTML5** | Estructura de la interfaz. |
| **CSS3** | Diseño y estilos. |

---

## 🏠 Configuración y Ejecución Local

### 1. Instalar PHP
Es necesario instalar **PHP 8.2 o una versión superior**. Puedes descargar la versión recomendada directamente desde este enlace:

👉 [Descargar PHP 8.2.35 (Windows x64)](https://php.net)

Una vez descargado, añade la ruta de PHP a las variables de entorno del sistema (`PATH`). Para verificar que la instalación fue exitosa, abre una terminal y ejecuta:
```bash
php -v
```

### 2. Iniciar el servidor WebSocket
Abre una terminal de Windows, navega hasta el directorio del proyecto donde se aloja el archivo `servidor_socket.php` y ejecuta:
```bash
php servidor_socket.php
```

> [!NOTE]
> El servidor WebSocket se levantará de forma automática utilizando el **puerto 30400**.

### 3. Configurar la dirección local
1. Accede a la carpeta `plugin_temas` y abre el archivo `background.js`.
2. Busca la sección **TRANSMISIÓN POR WEBSOCKET**.
3. Configura la URL del servidor local:
```javascript
const socket = new WebSocket("ws://127.0.0.1:30400");
```
4. Guarda los cambios del archivo.


## 🧩 Instalación de la Extensión en el Navegador

Una vez que hayas decidido y configurado tu conexión (Local o Remota), añade la extensión a tu navegador:

1. Abre la sección de administración de extensiones del navegador (`chrome://extensions/` o `edge://extensions/`).
2. Activa el interruptor del **Modo de desarrollador** (suele estar en la esquina superior derecha).
3. Haz clic en el botón **Cargar extensión sin empaquetar**.
4. Busca en tus archivos y selecciona la carpeta completa llamada `plugin_temas`.

---

## 🌐 Configuración del Acceso Remoto 

Si necesitas recibir conexiones desde redes externas durante tus pruebas, utilizaremos **Microsoft Dev Tunnels** para exponer el puerto local a Internet.

### 1. Instalar Microsoft Dev Tunnels
Abre una terminal de Windows y realiza la instalación mediante `winget`:
```bash
winget install Microsoft.devtunnel
```

### 2. Iniciar sesión
Puedes autenticarte rápidamente con cualquiera de tus cuentas existentes:

* **Mediante tu cuenta de GitHub:**
  ```bash
  devtunnel user login -g
  ```
* **Mediante tu cuenta de Microsoft:**
  ```bash
  devtunnel user login
  ```

### 3. Crear el túnel público
Ejecuta el siguiente comando para exponer el puerto `30400` hacia la red pública:
```bash
devtunnel host -p 30400 --allow-anonymous
```

> [!IMPORTANT]
> El parámetro `--allow-anonymous` permite que los clientes externos se conecten al túnel sin necesidad de autenticarse previamente con una cuenta de Microsoft o GitHub.

Al activarse, la terminal te proporcionará una **dirección pública (URL)** generada por Dev Tunnels.

### 4. Configurar la dirección remota
1. Regresa al archivo `background.js` dentro de la carpeta `plugin_temas`.
2. En la sección **TRANSMISIÓN POR WEBSOCKET**, sustituye la dirección local por la URL pública del túnel:
```javascript
const socket = new WebSocket("wss://URL-DEVTUNNEL");
```
> Asegúrate de reemplazar `URL-DEVTUNNEL` por la dirección exacta que te entregó la consola.
3. Guarda los cambios del archivo.

---

## 🧩 Instalación de la Extensión en el Navegador

Una vez que hayas decidido y configurado tu conexión (Local o Remota), añade la extensión a tu navegador:

1. Abre la sección de administración de extensiones del navegador (`chrome://extensions/` o `edge://extensions/`).
2. Activa el interruptor del **Modo de desarrollador** (suele estar en la esquina superior derecha).
3. Haz clic en el botón **Cargar extensión sin empaquetar**.
4. Busca en tus archivos y selecciona la carpeta completa llamada `plugin_temas`.

> [!NOTE]
> No es necesario desinstalar o volver a cargar la extensión si decides alternar entre el modo local y remoto. Únicamente modifica la dirección del WebSocket en `background.js`, guarda el archivo y haz clic en el icono de **Recargar** dentro del gestor de extensiones.

---

## 🔒 Consideraciones de Seguridad

* **Control del túnel:** No dejes el túnel público activo de manera indefinida cuando no estés trabajando. Cierra y detén Microsoft Dev Tunnels en la consola apenas termines tus pruebas.
* **Entornos de producción:** No emplees el parámetro `--allow-anonymous` en producción sin programar filtros robustos de autenticación y control de accesos en la lógica de tu servidor WebSocket.
* **Recomendación:** Prioriza el uso del **modo local** durante las fases de desarrollo activo; habilita el acceso remoto únicamente cuando requieras validar comportamientos desde el exterior.

---

## ✅ Resumen de Conexiones Intercambiables

Puedes alternar rápidamente entre ambas modalidades editando la variable del socket en `background.js`:

| Modalidad | Dirección del WebSocket |
| :--- | :--- |
| **🏠 Local** | `ws://127.0.0.1:30400` |
| **🌐 Remota** | `wss://URL-DEVTUNNEL` |




