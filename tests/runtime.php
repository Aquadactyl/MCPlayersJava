<?php

// Read-only smoke test against an installed addon and a running local test panel.
// No keys are created: authentication is set only in this CLI process.
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\QueryRunner;
use Pterodactyl\BlueprintFramework\Extensions\mcplayers\QueryTarget;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\User;

$panel = $argv[1] ?? '/app';
require $panel . '/vendor/autoload.php';
$app = require $panel . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();
$targets = new QueryTarget;
$server = Server::query()->with(['egg', 'node', 'allocation', 'gameQueryAllocation'])->get()->first(fn ($server) => $targets->resolve($server) !== null);
if (!$server) {
    throw new RuntimeException('Smoke test requires a configured Java server in the local test panel.');
}
$runner = new QueryRunner;
$result = $runner->query($targets->resolve($server));
echo 'Real PHP-to-Node query: ' . json_encode($result, JSON_THROW_ON_ERROR) . PHP_EOL;
if ($result['status'] !== 'available') {
    throw new RuntimeException('Start the local Minecraft Java server before the runtime smoke test.');
}

$request = Request::create('/api/client/extensions/mcplayers/servers/' . $server->uuid . '/players', 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/json']);
$app->instance('request', $request);
Auth::guard('sanctum')->setUser(User::query()->where('root_admin', true)->firstOrFail());
$response = $kernel->handle($request);
$payload = json_decode($response->getContent(), true, 10, JSON_THROW_ON_ERROR);
echo 'Authenticated endpoint: HTTP ' . $response->getStatusCode() . PHP_EOL;
if ($response->getStatusCode() !== 200 || ($payload['attributes']['status'] ?? null) !== 'available') {
    throw new RuntimeException(json_encode($payload, JSON_THROW_ON_ERROR));
}
Auth::forgetGuards();
$request = Request::create('/api/client/extensions/mcplayers/servers/' . $server->uuid . '/players', 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/json']);
$app->instance('request', $request);
$response = $kernel->handle($request);
echo 'Unauthenticated endpoint: HTTP ' . $response->getStatusCode() . PHP_EOL;
if ($response->getStatusCode() !== 401) {
    throw new RuntimeException('Unauthenticated listing must be rejected.');
}
Auth::forgetGuards();
$request = Request::create('/api/client/extensions/mcplayers/servers/' . $server->uuid . '/players', 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/json']);
$app->instance('request', $request);
$outsider = new User;
$outsider->forceFill(['id' => 0, 'uuid' => '44444444-4444-4444-8444-444444444444', 'root_admin' => false, 'use_totp' => true]);
Auth::guard('sanctum')->setUser($outsider);
$response = $kernel->handle($request);
echo 'Unrelated user endpoint: HTTP ' . $response->getStatusCode() . PHP_EOL;
if ($response->getStatusCode() !== 404) {
    throw new RuntimeException('Unrelated user must not see the server.');
}
echo 'Runtime smoke test passed.' . PHP_EOL;
