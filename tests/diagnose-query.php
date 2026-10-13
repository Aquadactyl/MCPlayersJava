<?php

// Read-only diagnostics: print only Query-related settings, never full properties or credentials.
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayerFiles;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\QueryRunner;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\QueryTarget;
use Pterodactyl\Models\Server;

$panel = $argv[1] ?? '/app';
require $panel . '/vendor/autoload.php';
$app = require $panel . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$targets = new QueryTarget;
foreach (Server::query()->with(['egg', 'node', 'allocation', 'gameQueryAllocation'])->get() as $server) {
    $target = $targets->resolve($server);
    if (!$target || (isset($argv[2]) && $argv[2] !== $server->uuid)) {
        continue;
    }
    $settings = [];
    $properties = $app->make(PlayerFiles::class)->read($server, '/server.properties', 65536);
    preg_match_all('/^\s*(enable-query|query\.port|server-port|enable-status)\s*[=:]\s*([^\r\n]*)/m', $properties, $matches, PREG_SET_ORDER);
    foreach ($matches as $match) {
        $settings[$match[1]] = trim($match[2]);
    }
    echo json_encode([
        'server' => $server->name, 'uuid' => $server->uuid, 'target' => $target,
        'properties' => $settings, 'result' => (new QueryRunner)->query($target),
    ], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . PHP_EOL;
}
