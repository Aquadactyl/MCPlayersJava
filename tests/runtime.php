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
echo 'Authenticated list: ' . json_encode([
    'source' => $payload['attributes']['source'], 'complete' => $payload['attributes']['complete'],
    'online' => $payload['attributes']['online'], 'players' => $payload['attributes']['players'],
], JSON_THROW_ON_ERROR) . PHP_EOL;
if ($result['source'] === 'query' && $payload['attributes']['source'] !== 'query') {
    throw new RuntimeException('The installed endpoint must expose the working full Query source.');
}
if (($payload['attributes']['capabilities'] ?? null) !== ['moderate' => true, 'operator' => true, 'inventory' => true]) {
    throw new RuntimeException('Administrator capabilities were not attached to the response.');
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

// Exercise installed middleware and validation without sending any real command.
$base = '/api/client/extensions/mcplayers/servers/' . $server->uuid . '/players/Alex';
$admin = User::query()->where('root_admin', true)->firstOrFail();
$cases = [
    ['POST', $base . '/actions', null, ['action' => 'kick', 'confirmed' => true], 401],
    ['GET', $base . '/inventory', null, [], 401],
    ['POST', $base . '/actions', $outsider, ['action' => 'kick', 'confirmed' => true], 404],
    ['GET', $base . '/inventory', $outsider, [], 404],
    ['POST', $base . '/actions', $admin, ['action' => 'stop', 'confirmed' => true], 422],
    ['POST', $base . '/actions', $admin, ['action' => 'ban'], 422],
    ['GET', $base . '/inventory', $admin, ['uuid' => '../bad'], 422],
];
foreach ($cases as [$method, $path, $user, $parameters, $expected]) {
    Auth::forgetGuards();
    $request = Request::create($path, $method, $parameters, [], [], ['HTTP_ACCEPT' => 'application/json']);
    $app->instance('request', $request);
    if ($user) {
        Auth::guard('sanctum')->setUser($user);
    }
    $response = $kernel->handle($request);
    echo $method . ' ' . basename($path) . ' auth/validation: HTTP ' . $response->getStatusCode() . PHP_EOL;
    if ($response->getStatusCode() !== $expected) {
        throw new RuntimeException('Expected HTTP ' . $expected . ': ' . $response->getContent());
    }
}
echo 'Runtime smoke test passed.' . PHP_EOL;
