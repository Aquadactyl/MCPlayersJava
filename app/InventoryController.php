<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Server;

class InventoryController extends ClientApiController
{
    public function __invoke(GetInventoryRequest $request, Server $server, InventoryService $inventories): array
    {
        $data = $request->validated();

        return ['object' => 'minecraft_inventory_snapshot', 'attributes' => $inventories->read($server, $data['player'], $data['uuid'] ?? null)];
    }
}
