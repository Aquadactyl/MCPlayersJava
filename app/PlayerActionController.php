<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use Illuminate\Support\Facades\Cache;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Server;
use Pterodactyl\Repositories\Wings\DaemonCommandRepository;

class PlayerActionController extends ClientApiController
{
    public function __invoke(PlayerActionRequest $request, Server $server, PlayerCommand $commands, DaemonCommandRepository $wings, QueryTarget $targets): array
    {
        $data = $request->validated();
        $command = $commands->build($data['player'], $data['action'], $data['reason'] ?? null);
        $wings->setServer($server)->send($command);
        Activity::event('server:console.command')
            ->property('command', $command)
            ->property('addon', 'mcplayers')
            ->property('player_action', $data['action'])
            ->log();
        $target = $targets->resolve($server);
        if ($target !== null) {
            Cache::forget('mcplayers:v1:' . $server->uuid . ':' . sha1(json_encode($target, JSON_THROW_ON_ERROR)));
        }

        // Wings acknowledges submission; Minecraft's console reports the command result.
        return ['object' => 'minecraft_player_action', 'attributes' => ['status' => 'submitted', 'action' => $data['action'], 'player' => $data['player']]];
    }
}
