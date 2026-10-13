<?php

// In-memory tests only. Commands are captured by a fake Wings repository.
require __DIR__ . '/backend.php';

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\Psr7\Request as GuzzleRequest;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\GetInventoryRequest;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\GetPlayersRequest;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\InventoryService;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\InventorySnapshot;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\NbtReader;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayerActionController;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayerActionRequest;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayerCommand;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayerFiles;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayerPermissions;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayersController;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\User;
use Pterodactyl\Repositories\Wings\DaemonCommandRepository;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;

function rejects(callable $operation, string $description): void
{
    try {
        $operation();
    } catch (InvalidArgumentException|UnexpectedValueException|HttpException $exception) {
        check(true, $description);

        return;
    }
    check(false, $description);
}

$start = $checks;
$commands = new PlayerCommand;
check($commands->build('Alex', 'kick', ' Please follow the rules ') === 'kick Alex Please follow the rules', 'Kick reason is one literal command argument');
check($commands->build('Alex', 'ban', 'Griefing') === 'ban Alex Griefing', 'Ban command includes optional reason');
foreach (['op', 'deop', 'pardon'] as $action) {
    check($commands->build('Alex', $action) === $action . ' Alex', 'Build ' . $action . ' command');
}
check($commands->build('Alex', 'whitelist_add') === 'whitelist add Alex', 'Whitelist add');
check($commands->build('Alex', 'whitelist_remove') === 'whitelist remove Alex', 'Whitelist remove');
foreach (['@a', '../Alex', 'Alex;op', "Alex\nop Steve", str_repeat('a', 17)] as $name) {
    rejects(fn () => $commands->build($name, 'ban'), 'Reject unsafe player target ' . json_encode($name));
}
foreach (["reason\nop Steve", "reason\rstop", "reason\0", "reason\u{2028}stop", str_repeat('x', 121)] as $reason) {
    rejects(fn () => $commands->build('Alex', 'kick', $reason), 'Reject multiline/control/oversized reason');
}
rejects(fn () => $commands->build('Alex', 'stop'), 'Reject arbitrary command actions');

$server = fixture();
$user = new User;
$user->forceFill(['id' => 906, 'root_admin' => false]);
$subuser = new Subuser;
$subuser->forceFill(['user_id' => 906, 'permissions' => ['control.console']]);
$server->setRelation('subusers', collect([$subuser]));
$route = new Route('POST', '/servers/{server}/players/{player}/actions', fn () => null);
$route->bind(Request::create('/servers/fixture/players/Alex/actions'));
$route->setParameter('server', $server);
$route->setParameter('player', 'Alex');
$actionRequest = PlayerActionRequest::create('/servers/fixture/players/Alex/actions', 'POST', ['action' => 'kick', 'confirmed' => true]);
$actionRequest->setRouteResolver(fn () => $route);
$actionRequest->setUserResolver(fn () => $user);
check($actionRequest->authorize(), 'Console-authorized subuser can moderate');
$actionRequest->merge(['action' => 'op']);
check(!$actionRequest->authorize(), 'Console subuser cannot OP players');
$actionRequest->merge(['action' => 'deop']);
check(!$actionRequest->authorize(), 'Console subuser cannot de-OP players');
$user->id = $server->owner_id;
check($actionRequest->authorize(), 'Owner can de-OP');
$actionRequest->merge(['action' => 'op']);
check($actionRequest->authorize(), 'Owner can OP');
$user->id = 906;
$user->root_admin = true;
check($actionRequest->authorize(), 'Administrator can OP');
$user->root_admin = false;
$actionRequest->merge(['action' => 'kick']);
$subuser->permissions = ['file.read'];
check(!$actionRequest->authorize(), 'Subuser without console access cannot send any player action');
$subuser->permissions = ['control.console'];
$inventoryRequest = GetInventoryRequest::create('/servers/fixture/players/Alex/inventory');
$inventoryRequest->setRouteResolver(fn () => $route);
$inventoryRequest->setUserResolver(fn () => $user);
check(!$inventoryRequest->authorize(), 'Console permission does not imply inventory permission');
$subuser->permissions = ['control.console', 'file.read-content'];
check(!$inventoryRequest->authorize(), 'Inventory also requires file listing permission');
$subuser->permissions = ['control.console', 'file.read-content', 'file.read'];
check($inventoryRequest->authorize(), 'File-authorized console user can inspect snapshots');
$caps = (new PlayerPermissions)->capabilities($user, $server);
check($caps === ['moderate' => true, 'operator' => false, 'inventory' => true], 'Capabilities match actual permissions');

$validator = $app->make('validator');
check($validator->make(['player' => 'Alex', 'action' => 'ban', 'confirmed' => false], $actionRequest->rules())->fails(), 'Explicit confirmation is required');
check($validator->make(['player' => '@a', 'action' => 'ban', 'confirmed' => true], $actionRequest->rules())->fails(), 'Request validation rejects selectors');
check($validator->make(['player' => 'Alex', 'action' => 'ban', 'confirmed' => true, 'reason' => "test\nop Steve"], $actionRequest->rules())->fails(), 'Request validation rejects command injection');
$actionRequest->merge(['player' => 'Steve']);
check($actionRequest->validationData()['player'] === 'Alex', 'Route player cannot be overridden by the request body');

$listing = GetPlayersRequest::create('/servers/fixture/players');
$listing->setUserResolver(fn () => $user);
$listingController = $app->make(PlayersController::class);
$privileged = $listingController($listing, $server, $targets, $runner);
$subuser->permissions = ['control.console'];
$restricted = $listingController($listing, $server, $targets, $runner);
check($privileged['attributes']['capabilities']['inventory'] && !$restricted['attributes']['capabilities']['inventory'], 'Shared player cache never shares user-specific inventory access');

$wings = new class($app) extends DaemonCommandRepository
{
    public array $commands = [];
    public function send(array|string $command): Psr\Http\Message\ResponseInterface
    {
        $this->commands[] = $command;

        return new GuzzleResponse(204);
    }
};
$audit = new class
{
    public array $properties = [];
    public function event(string $event): self { $this->properties['event'] = $event; return $this; }
    public function property(string $key, mixed $value): self { $this->properties[$key] = $value; return $this; }
    public function log(): void {}
};
Activity::swap($audit);
$actionRequest->merge(['action' => 'ban', 'reason' => 'Griefing', 'confirmed' => true]);
$actionRequest->setValidator($validator->make($actionRequest->validationData(), $actionRequest->rules()));
$result = $app->make(PlayerActionController::class)($actionRequest, $server, $commands, $wings, $targets);
check($wings->commands === ['ban Alex Griefing'], 'Controller sends exactly one validated command through Wings');
check($result['attributes']['status'] === 'submitted', 'Response claims submission, not an unverified Minecraft result');
check($audit->properties['event'] === 'server:console.command' && $audit->properties['command'] === 'ban Alex Griefing', 'Player action is recorded in the activity log');

function nbtPayload(int $type, mixed $value): string
{
    switch ($type) {
        case 1: return pack('c', $value);
        case 2: return pack('n', $value);
        case 3: return pack('N', $value);
        case 4: return pack('J', $value);
        case 5: return pack('G', $value);
        case 6: return pack('E', $value);
        case 7: return pack('N', strlen($value)) . $value;
        case 8: return pack('n', strlen($value)) . $value;
        case 9: return chr($value[0]) . pack('N', count($value[1])) . implode('', array_map(fn ($item) => nbtPayload($value[0], $item), $value[1]));
        case 10:
            $output = '';
            foreach ($value as $key => [$tagType, $payload]) {
                $output .= chr($tagType) . nbtPayload(8, $key) . nbtPayload($tagType, $payload);
            }
            return $output . "\0";
        case 11: return pack('N', count($value)) . implode('', array_map(fn ($item) => pack('N', $item), $value));
        case 12: return pack('N', count($value)) . implode('', array_map(fn ($item) => pack('J', $item), $value));
    }
    throw new UnexpectedValueException('Invalid fixture type');
}
function nbtRoot(array $fields): string { return "\x0a\0\0" . nbtPayload(10, $fields); }
$reader = new NbtReader;
$normalizer = new InventorySnapshot;
$oldFields = [
    'DataVersion' => [3, 3700], 'Health' => [5, 18.5], 'foodLevel' => [3, 19], 'XpLevel' => [3, 12], 'XpP' => [5, 0.375],
    'SelectedItemSlot' => [3, 0], 'Dimension' => [8, 'minecraft:overworld'], 'Pos' => [9, [6, [12.25, 64.0, -42.75]]],
    'Inventory' => [9, [10, [
        ['Slot' => [1, 0], 'id' => [8, 'minecraft:diamond_sword'], 'Count' => [1, 1], 'tag' => [10, ['Damage' => [3, 12]]]],
        ['Slot' => [1, 9], 'id' => [8, 'minecraft:stone'], 'Count' => [1, 64]],
        ['Slot' => [1, 103], 'id' => [8, 'minecraft:diamond_helmet'], 'Count' => [1, 1]],
        ['Slot' => [1, -106], 'id' => [8, 'minecraft:shield'], 'Count' => [1, 1]],
    ]]],
    'EnderItems' => [9, [10, [['Slot' => [1, 26], 'id' => [8, 'minecraft:emerald'], 'Count' => [1, 7]]]]],
];
$oldNbt = nbtRoot($oldFields);
$old = $normalizer->fromNbt($reader->parse(gzencode($oldNbt)));
check(count($old['inventory']) === 4 && $old['inventory'][3]['slot'] === 150, 'Legacy signed-byte offhand slot is decoded correctly');
check($old['inventory'][0]['metadata']['Damage'] === 12, 'Legacy item tags are preserved');
check($old['ender_chest'][0]['slot'] === 26 && $old['ender_chest'][0]['count'] === 7, 'Ender Chest slots and counts are preserved');
check($old['health'] === 18.5 && $old['food'] === 19 && $old['xp_level'] === 12, 'Saved vitals are decoded');
check($old['xp_progress'] === 0.375, 'Saved fractional XP progress is decoded separately from level');
check($normalizer->fromNbt([])['xp_progress'] === null, 'Missing XP progress remains unknown');
check($normalizer->fromNbt(['XpP' => 0.0])['xp_progress'] === 0.0, 'Zero XP progress is preserved');
check($normalizer->fromNbt(['XpP' => 1.0])['xp_progress'] === 1.0, 'Full XP progress is preserved');
foreach ([-0.1, 1.1, NAN, INF, '0.5'] as $invalidProgress) {
    check($normalizer->fromNbt(['XpP' => $invalidProgress])['xp_progress'] === null, 'Invalid XP progress is not presented as a percentage');
}
check($old['position'] === [12.3, 64.0, -42.8], 'Big-endian doubles preserve saved position');
$modernFields = $oldFields;
$modernFields['Inventory'] = [9, [10, [['Slot' => [1, 0], 'id' => [8, 'minecraft:diamond_sword'], 'count' => [3, 1], 'components' => [10, ['minecraft:damage' => [3, 5]]]]]]];
$modernFields['equipment'] = [10, [
    'head' => [10, ['id' => [8, 'minecraft:netherite_helmet'], 'count' => [3, 1]]],
    'offhand' => [10, ['id' => [8, 'minecraft:totem_of_undying'], 'count' => [3, 1]]],
]];
$modern = $normalizer->fromNbt($reader->parse(nbtRoot($modernFields)));
check($modern['inventory'][1]['slot'] === 103 && $modern['inventory'][2]['slot'] === 150, 'Modern equipment compound maps armour and offhand');
check($modern['inventory'][0]['metadata']['minecraft:damage'] === 5, 'Modern item components are preserved');
$types = $reader->parse(nbtRoot(['short' => [2, -2], 'int' => [3, -20], 'long' => [4, PHP_INT_MAX], 'bytes' => [7, "\0\1\2"], 'ints' => [11, [1, -2]], 'longs' => [12, [1, 2]], 'empty' => [9, [0, []]]]));
check($types['short'] === -2 && $types['int'] === -20 && $types['long'] === (string) PHP_INT_MAX, 'Signed integers and precise 64-bit metadata');
check($types['ints'] === [1, -2] && $types['longs'] === ['1', '2'] && $types['empty'] === [], 'NBT array and empty-list tags');
foreach (["\1\0\0", substr($oldNbt, 0, -1), $oldNbt . 'junk', "\x0a\0\0\x0d\0\1x", "\x0a\0\0\x09\0\1x\x01\xff\xff\xff\xff\0"] as $malformed) {
    rejects(fn () => $reader->parse($malformed), 'Reject malformed/truncated/unsupported NBT');
}
rejects(fn () => $reader->parse(str_repeat('x', 2097153)), 'Reject oversized compressed input');
rejects(fn () => $reader->parse(gzencode(str_repeat('x', 8388609))), 'Reject decompression bomb');
$nested = ['x' => [8, 'value']];
for ($index = 0; $index < 66; $index++) { $nested = ['nested' => [10, $nested]]; }
rejects(fn () => $reader->parse(nbtRoot($nested)), 'Reject excessively deep NBT');
$filtered = $normalizer->fromNbt(['Inventory' => [['Slot' => 0, 'id' => '<script>', 'count' => 1], ['Slot' => 1, 'id' => 'minecraft:air'], ['Slot' => 2, 'id' => 'minecraft:stone', 'count' => 0], ['Slot' => 3, 'id' => 'mod:weapons/sword', 'count' => 2]], 'Health' => INF]);
check(count($filtered['inventory']) === 1 && $filtered['inventory'][0]['id'] === 'mod:weapons/sword' && $filtered['health'] === null, 'Invalid items and non-finite vitals are excluded');
$truncated = $normalizer->fromNbt(['Inventory' => [['Slot' => 0, 'id' => 'minecraft:book', 'count' => 1, 'components' => ['text' => str_repeat('x', 17000)]]]]);
check($truncated['inventory'][0]['metadata_truncated'] && $truncated['inventory'][0]['metadata'] === null, 'Oversized item metadata is explicitly marked');

$files = new class extends PlayerFiles
{
    public array $contents = [];
    public array $paths = [];
    public array $entries = [];
    public function __construct() {}
    public function read(Server $server, string $path, int $limit): string
    {
        $this->paths[] = $path;
        if (!array_key_exists($path, $this->contents)) {
            throw new DaemonConnectionException(new ClientException('Missing fixture', new GuzzleRequest('GET', 'http://wings.test'), new GuzzleResponse(500)));
        }
        return $this->contents[$path];
    }
    public function directory(Server $server, string $path): array { return $this->entries; }
};
$service = new InventoryService($files, $reader, $normalizer);
$offline = $service->offlineUuid('Alex');
$files->contents = ['/server.properties' => 'level-name=world', '/usercache.json' => json_encode([['name' => 'Alex', 'uuid' => $offline]]), '/world/playerdata/' . $offline . '.dat' => gzencode($oldNbt), '/ops.json' => '[]', '/banned-players.json' => '[]', '/whitelist.json' => json_encode([['name' => 'Alex', 'uuid' => $offline]])];
$files->entries = [['name' => $offline . '.dat', 'modified' => '2026-10-13T12:00:00Z']];
$snapshot = $service->read($server, 'alex', '069a79f4-44e9-4726-a5be-fca90e38aaf5');
check($snapshot['uuid'] === $offline && $snapshot['player'] === 'Alex', 'Server usercache overrides skin/status UUID and preserves offline identity');
check($snapshot['saved_at'] === '2026-10-13T12:00:00Z' && $snapshot['source'] === 'saved_file', 'Snapshot has real save time and saved-file label');
check($snapshot['state'] === ['operator' => false, 'banned' => false, 'whitelisted' => true], 'Read saved player permission lists');
unset($files->contents['/world/playerdata/' . $offline . '.dat']);
$files->contents['/world/players/data/' . $offline . '.dat'] = gzencode($oldNbt);
check($service->read($server, 'Alex')['uuid'] === $offline, 'Aquadactyl alternate player-data path is supported');
$files->contents['/usercache.json'] = '[]';
check($service->read($server, 'Alex')['uuid'] === $offline, 'Offline UUID fallback uses Java-compatible name hash');
check($service->world("level-name=My\\ World\n") === 'My World', 'Escaped Java property world name');
check($service->world("level-name=worlds/main\n") === 'worlds/main', 'Safe nested world folders');
foreach (['../world', '/etc', 'world/../../etc', 'C:/data', 'world//main'] as $path) {
    rejects(fn () => $service->world('level-name=' . $path), 'Reject unsafe world path ' . $path);
}
rejects(fn () => $service->read($server, '../Alex'), 'Reject inventory player path injection');
rejects(fn () => $service->read($server, 'Nobody'), 'Missing saved data is not an empty inventory');
$files->contents['/world/players/data/' . $offline . '.dat'] = 'broken';
rejects(fn () => $service->read($server, 'Alex'), 'Malformed saved data produces a recoverable API error');

$fileRepository = new class($app) extends DaemonFileRepository
{
    public Client $client;
    public function getHttpClient(array $headers = []): Client { return $this->client; }
};
$fileRepository->client = new Client(['handler' => new MockHandler([new GuzzleResponse(200, [], 'contents'), new GuzzleResponse(200, [], str_repeat('x', 100))])]);
$streamReader = new PlayerFiles($fileRepository);
check($streamReader->read($server, '/fixture.dat', 64) === 'contents', 'Wings streaming reader returns bounded contents');
rejects(fn () => $streamReader->read($server, '/fixture.dat', 64), 'Streaming limit works without a Content-Length header');
echo ($checks - $start) . ' management and inventory checks passed; ' . $checks . ' total backend checks.' . PHP_EOL;
