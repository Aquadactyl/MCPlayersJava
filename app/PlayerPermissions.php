<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use Pterodactyl\Models\Permission;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\User;

class PlayerPermissions
{
    public function capabilities(User $user, Server $server): array
    {
        if (!(new QueryTarget)->supports($server)) {
            return ['moderate' => false, 'operator' => false, 'inventory' => false];
        }
        $console = $user->can(Permission::ACTION_CONTROL_CONSOLE, $server);

        return [
            'moderate' => $console,
            'operator' => $console && ($user->root_admin || $user->id === $server->owner_id),
            'inventory' => $console && $user->can(Permission::ACTION_FILE_READ, $server)
                && $user->can(Permission::ACTION_FILE_READ_CONTENT, $server),
        ];
    }
}
