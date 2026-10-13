<?php

// Run against an installed addon: php /path/to/backend.php /app
// Uses only in-memory models and cache; no database writes or persistent credentials.
use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\Repository;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\GetPlayersRequest;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\PlayersController;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\QueryRunner;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\QueryTarget;
use Pterodactyl\Http\Middleware\Api\Client\Server\AuthenticateServerAccess;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\User;

$panel = $argv[1] ?? '/app';
require $panel . '/vendor/autoload.php';
$app = require $panel . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
Cache::swap(new Repository(new ArrayStore));

$checks = 0;
function check(bool $passed, string $description): void
{
    global $checks;
    if (!$passed) {
        throw new RuntimeException('FAIL: ' . $description);
    }
    $checks++;
    echo 'PASS: ' . $description . PHP_EOL;
}

function fixture(): Server
{
    $server = new Server;
    $server->forceFill(['id' => 901, 'node_id' => 902, 'owner_id' => 903, 'uuid' => '11111111-1111-4111-8111-111111111111', 'game_query_type' => 'auto', 'status' => null]);
    $node = new Node;
    $node->forceFill(['id' => 902, 'fqdn' => 'wings.example.test', 'query_address' => 'query.example.test', 'maintenance_mode' => false]);
    $egg = new Egg;
    $egg->forceFill(['name' => 'Paper']);
    $primary = new Allocation;
    $primary->forceFill(['id' => 904, 'node_id' => 902, 'server_id' => 901, 'ip' => '192.0.2.1', 'port' => 25565]);
    $query = new Allocation;
    $query->forceFill(['id' => 905, 'node_id' => 902, 'server_id' => 901, 'ip' => '192.0.2.2', 'port' => 25566]);
    $server->setRelation('node', $node)->setRelation('egg', $egg)->setRelation('allocation', $primary)->setRelation('gameQueryAllocation', $query)->setRelation('subusers', collect())->setRelation('transfer', null);

    return $server;
}

$targets = new QueryTarget;
$server = fixture();
config(['game-query.enabled' => false]);
check($targets->resolve($server) === null, 'Global game query disable is respected');
config(['game-query.enabled' => true]);
$target = $targets->resolve($server);
check($target['queryPort'] === 25566 && $target['statusPort'] === 25565, 'Separate assigned Query and TCP status ports');
check($target['queryHost'] === 'query.example.test', 'Administrator configured query address');
$server->gameQueryAllocation->server_id = 99;
check($targets->resolve($server) === null, 'Reject allocation belonging to another server');
$server = fixture();
$server->allocation->node_id = 99;
check($targets->resolve($server) === null, 'Reject allocation belonging to another node');
foreach (['none', 'protocol-minecraftbedrock', 'rust'] as $type) {
    $server = fixture();
    $server->game_query_type = $type;
    check($targets->resolve($server) === null, 'Reject unsupported/disabled type ' . $type);
}
foreach (['Minecraft Bedrock', 'Nukkit', 'Factorio'] as $name) {
    $server = fixture();
    $server->egg->name = $name;
    check($targets->resolve($server) === null, 'Reject non-Java egg ' . $name);
}
$server = fixture();
$server->egg->name = 'Custom Java Egg';
$server->game_query_type = 'protocol-minecraftvanilla';
check($targets->resolve($server) !== null, 'Explicit Java type supports custom eggs');
$server = fixture();
$server->node->query_address = null;
$server->setRelation('gameQueryAllocation', null);
check($targets->resolve($server)['queryPort'] === 25565, 'Default Query uses primary allocation');
$server->allocation->ip = '0.0.0.0';
check($targets->resolve($server)['queryHost'] === 'wings.example.test', 'Wildcard allocation uses node hostname');
config(['game-query.local_container_queries' => true]);
$server->node->fqdn = 'wings.localhost';
check($targets->resolve($server)['queryHost'] === $server->uuid, 'Local Docker network uses container UUID');

$server = fixture();
$user = new User;
$user->forceFill(['id' => 903, 'root_admin' => false]);
$route = new Route('GET', '/servers/{server}/players', fn () => null);
$route->bind(Request::create('/servers/fixture/players'));
$route->setParameter('server', $server);
$request = GetPlayersRequest::create('/servers/fixture/players');
$request->setRouteResolver(fn () => $route);
$request->setUserResolver(fn () => $user);
check($request->authorize(), 'Server owner has listing permission');
$user->id = 906;
$subuser = new Subuser;
$subuser->forceFill(['user_id' => 906, 'server_id' => 901, 'permissions' => ['control.console']]);
$server->setRelation('subusers', collect([$subuser]));
check($request->authorize(), 'Console-authorized subuser can view players');
$subuser->permissions = ['file.read'];
check(!$request->authorize(), 'Subuser without console permission is rejected');
$user->id = 907;
check(!$request->authorize(), 'Unrelated user has no listing permission');
try {
    (new AuthenticateServerAccess)->handle($request, fn () => true);
    check(false, 'Unrelated user must receive 404');
} catch (Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
    check(true, 'Server access middleware hides unrelated servers');
}
$user->root_admin = true;
check($request->authorize(), 'Administrator has listing permission');
$route->setParameter('server', null);
check(!$request->authorize(), 'Missing server fails authorization');

$runner = new class extends QueryRunner
{
    public int $calls = 0;

    public function query(array $target): array
    {
        $this->calls++;

        return ['status' => 'available', 'source' => 'query', 'complete' => true, 'online' => 1, 'maximum' => 20, 'players' => [['name' => 'Alex', 'uuid' => null]]];
    }
};
$controller = $app->make(PlayersController::class);
$server = fixture();
$first = $controller($request, $server, $targets, $runner);
$second = $controller($request, $server, $targets, $runner);
check($runner->calls === 1 && $first === $second, 'Repeated requests use shared server cache');
check(is_string($first['attributes']['checked_at']), 'Snapshot includes check time');
$server->gameQueryAllocation->port = 25567;
$controller($request, $server, $targets, $runner);
check($runner->calls === 2, 'Allocation changes invalidate cached target');
$server->uuid = '22222222-2222-4222-8222-222222222222';
$controller($request, $server, $targets, $runner);
check($runner->calls === 3, 'Server caches are isolated');
$server->game_query_type = 'none';
check($controller($request, $server, $targets, $runner)['attributes']['status'] === 'unsupported', 'Disabled server never queries');
$server = fixture();
$server->uuid = '33333333-3333-4333-8333-333333333333';
$key = 'mcplayers:v1:' . $server->uuid . ':' . sha1(json_encode($targets->resolve($server), JSON_THROW_ON_ERROR));
$lock = Cache::lock($key . ':lock', 8);
$lock->get();
check($controller($request, $server, $targets, $runner)['attributes']['status'] === 'pending' && $runner->calls === 3, 'Concurrent requests wait without spawning another query');
$lock->release();

$route = $app['router']->getRoutes()->getByName('api:client:extensions.mcplayers.players');
check($route !== null, 'Blueprint registered the addon route');
$middleware = $route->gatherMiddleware();
check(in_array(AuthenticateServerAccess::class, $middleware, true) && in_array('blueprint/api', $middleware, true) && in_array('blueprint/client-api', $middleware, true), 'Installed endpoint enforces panel authentication and server membership');
check(in_array('throttle:20,1,mcplayers:', $middleware, true), 'Installed endpoint has query rate limit');
echo $checks . ' backend checks passed.' . PHP_EOL;
