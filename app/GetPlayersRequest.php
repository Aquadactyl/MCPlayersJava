<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;
use Pterodactyl\Models\Permission;

class GetPlayersRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return Permission::ACTION_CONTROL_CONSOLE;
    }
}
