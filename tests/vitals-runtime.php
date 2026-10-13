<?php

// Read-only inspection of selected vitals on an existing local player save.
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\InventoryService;
use Pterodactyl\Models\Server;

$panel = $argv[1] ?? '/app';
require $panel . '/vendor/autoload.php';
$app = require $panel . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (!isset($argv[2], $argv[3])) {
    throw new InvalidArgumentException('Usage: php vitals-runtime.php PANEL SERVER_UUID PLAYER');
}
$server = Server::query()->where('uuid', $argv[2])->firstOrFail();
$snapshot = $app->make(InventoryService::class)->read($server, $argv[3]);
if (!array_key_exists('xp_progress', $snapshot)) {
    throw new RuntimeException('The installed snapshot decoder is missing XP progress.');
}
echo json_encode(array_intersect_key($snapshot, array_flip([
    'health', 'food', 'xp_level', 'xp_progress', 'saved_at', 'source',
])), JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . PHP_EOL;
