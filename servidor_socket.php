<?php
declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

require __DIR__ . '/vendor/autoload.php';

use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServer;
use Ratchet\MessageComponentInterface;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;

const DIRECCION = '127.0.0.1';
const PUERTO = 30400;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_CLIENTS = 20;
const MAX_CLIENTS_PER_IP = 3;
const MIN_TIME_BETWEEN_UPLOADS = 0.5;
const UPLOAD_DIR = __DIR__ . '/descargas/';


const ALLOWED_ORIGINS = [];

final class ServidorJson implements MessageComponentInterface
{
    
    private array $estados = [];

    public function onOpen(ConnectionInterface $conn): void
    {
        // Limite de clientes
        if (count($this->estados) >= MAX_CLIENTS) {
            $conn->close();
            return;
        }

        // Limite de conexiones simultaneas por IP
        $ip = $this->obtenerIp($conn);
        $porIp = 0;

        foreach ($this->estados as $estado) {
            if ($estado['ip'] === $ip) {
                $porIp++;
            }
        }

        if ($porIp >= MAX_CLIENTS_PER_IP) {
            echo "[BLOQUEADO] Demasiadas conexiones desde {$ip}\n";
            $conn->close();
            return;
        }

        
        if (ALLOWED_ORIGINS !== []) {
            $origen = $conn->httpRequest->getHeaderLine('Origin');

            if (!in_array($origen, ALLOWED_ORIGINS, true)) {
                $conn->close();
                return;
            }
        }

        $this->estados[spl_object_id($conn)] = [
            'ip' => $ip,
            'ultimo_envio' => 0.0,
            'conectado_en' => microtime(true),
        ];
    }

    public function onMessage(ConnectionInterface $from, mixed $msg): void
    {
        $id = spl_object_id($from);

        if (!isset($this->estados[$id])) {
            $from->close();
            return;
        }

        if (is_object($msg) && method_exists($msg, 'isBinary') && $msg->isBinary()) {
            $from->close();
            return;
        }

        $datos = (string) $msg;

     
        if (strlen($datos) > MAX_FILE_SIZE) {
            $from->close();
            return;
        }

        if (!preg_match('//u', $datos)) {
            $this->enviarError($from, 'Mensaje UTF-8 invalido.');
            $from->close();
            return;
        }

        if (str_starts_with($datos, "\xEF\xBB\xBF")) {
            $datos = substr($datos, 3);
        }

        if (trim($datos) === '') {
            $this->enviarError($from, 'Mensaje vacio.');
            return;
        }

        $this->recibirPaqueteJSON($from, trim($datos));
    }

    public function onClose(ConnectionInterface $conn): void
    {
        unset($this->estados[spl_object_id($conn)]);
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        echo "[ERROR] {$e->getMessage()}\n";
        $conn->close();
    }

    private function recibirPaqueteJSON(ConnectionInterface $socket, string $texto): void
    {
        $id = spl_object_id($socket);

        $paquete = json_decode($texto, true, 8);

        if (
            json_last_error() !== JSON_ERROR_NONE ||
            !is_array($paquete) ||
            !isset($paquete['contenido'], $paquete['nombre']) ||
            !is_string($paquete['contenido']) ||
            !is_string($paquete['nombre'])
        ) {
            $this->enviarError($socket, 'Estructura JSON invalida.');
            return;
        }

        $contenido = $paquete['contenido'];
        $nombre = $paquete['nombre'];

        if (
            strlen($contenido) > MAX_FILE_SIZE ||
            $contenido === '' ||
            strlen($nombre) > 255
        ) {
            $this->enviarError($socket, 'Nombre o contenido fuera de los limites.');
            return;
        }

        $ahora = microtime(true);

        if ($ahora - $this->estados[$id]['ultimo_envio'] < MIN_TIME_BETWEEN_UPLOADS) {
            $this->enviarError($socket, 'Subida demasiado rapida.');
            return;
        }

        $this->estados[$id]['ultimo_envio'] = $ahora;

        json_decode($contenido, true, 15);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->enviarError($socket, 'El contenido no es JSON valido.');
            return;
        }

        $base = basename(str_replace('\\', '/', $nombre));

        if (strtolower(pathinfo($base, PATHINFO_EXTENSION)) !== 'json') {
            $this->enviarError($socket, 'Solo se permiten archivos .json.');
            return;
        }

        $filtrado = preg_replace('/[^a-zA-Z0-9_.-]/', '', $base);

        if (
            !is_string($filtrado) ||
            $filtrado === '' ||
            $filtrado === '.' ||
            $filtrado === '..'
        ) {
            $this->enviarError($socket, 'Nombre de archivo invalido.');
            return;
        }

        if (!is_dir(UPLOAD_DIR)) {
            if (!@mkdir(UPLOAD_DIR, 0750, true) && !is_dir(UPLOAD_DIR)) {
                $this->enviarError($socket, 'No se pudo crear el directorio.');
                return;
            }
        }

        if (!is_writable(UPLOAD_DIR)) {
            $this->enviarError($socket, 'Directorio sin permisos de escritura.');
            return;
        }

        $nombreSeguro = bin2hex(random_bytes(16)) . '_' . $filtrado . '.txt';
        $ruta = UPLOAD_DIR . $nombreSeguro;

        $archivo = @fopen($ruta, 'xb');

        if ($archivo === false) {
            $this->enviarError($socket, 'No se pudo crear el archivo.');
            return;
        }

        $total = 0;
        $longitud = strlen($contenido);
        $correcto = true;

        while ($total < $longitud) {
            $escrito = @fwrite($archivo, substr($contenido, $total, 65536));

            if ($escrito === false || $escrito === 0) {
                $correcto = false;
                break;
            }

            $total += $escrito;
        }

        if (!fclose($archivo)) {
            $correcto = false;
        }

        if (!$correcto || $total !== $longitud) {
            @unlink($ruta);
            $this->enviarError($socket, 'Error al escribir el archivo.');
            return;
        }

        echo "[OK] JSON guardado: {$nombreSeguro}\n";

        $this->responder($socket, [
            'success' => true,
            'msg' => 'Guardado en servidor',
        ]);
    }

    private function obtenerIp(ConnectionInterface $conn): string
    {
        $direccion = (string) ($conn->remoteAddress ?? '');

        if (str_starts_with($direccion, '[')) {
            return strstr($direccion, ']', true) . ']';
        }

        if (substr_count($direccion, ':') === 1) {
            return explode(':', $direccion)[0];
        }

        return $direccion;
    }

    private function responder(ConnectionInterface $socket, array $datos): void
    {
        $json = json_encode(
            $datos,
            JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );

        if ($json !== false) {
            $socket->send($json);
        }
    }

    private function enviarError(ConnectionInterface $socket, string $mensaje): void
    {
        echo "[BLOQUEADO] {$mensaje}\n";

        $this->responder($socket, [
            'success' => false,
            'error' => $mensaje,
        ]);
    }
}

$servidor = IoServer::factory(
    new HttpServer(new WsServer(new ServidorJson())),
    PUERTO,
    DIRECCION
);

echo "Servidor WebSocket activo en ws://" . DIRECCION . ':' . PUERTO . "\n";

$servidor->run();

