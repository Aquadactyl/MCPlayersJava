<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use Illuminate\Support\Facades\Cache;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Server;

class PlayersController extends ClientApiController
{
    public function __invoke(GetPlayersRequest $request, Server $server, QueryTarget $targets, QueryRunner $runner): array
    {
        $target = $targets->resolve($server);
        $capabilities = (new PlayerPermissions)->capabilities($request->user(), $server);
        $empty = ['status' => 'unsupported', 'source' => null, 'complete' => false, 'online' => null, 'maximum' => null, 'players' => [], 'checked_at' => null];
        if ($target === null) {
            return ['object' => 'minecraft_player_list', 'attributes' => $empty + ['capabilities' => $capabilities]];
        }

        $key = 'mcplayers:v1:' . $server->uuid . ':' . sha1(json_encode($target, JSON_THROW_ON_ERROR));
        $result = Cache::get($key);
        if ($result === null) {
            $lock = Cache::lock($key . ':lock', 8);
            if ($lock->get()) {
                try {
                    // Recheck after acquiring the lock to avoid duplicate queries.
                    $result = Cache::get($key);
                    if ($result === null) {
                        $result = $runner->query($target);
                        $result['checked_at'] = now()->toIso8601String();
                        Cache::put($key, $result, 10);
                    }
                } finally {
                    $lock->release();
                }
            } else {
                $result = array_replace($empty, ['status' => 'pending']);
            }
        }

        // Permissions belong to the requesting user, never the shared server cache.
        return ['object' => 'minecraft_player_list', 'attributes' => $result + ['capabilities' => $capabilities]];
    }
}
