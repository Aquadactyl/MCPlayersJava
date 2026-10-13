<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use Pterodactyl\Models\Server;

class QueryTarget
{
    public function resolve(Server $server): ?array
    {
        if (!config('game-query.enabled', true) || !$this->supports($server)) {
            return null;
        }
        $primary = $server->allocation;
        $query = $server->gameQueryAllocation ?? $primary;
        foreach ([$primary, $query] as $allocation) {
            if (!$allocation || $allocation->server_id !== $server->id || $allocation->node_id !== $server->node_id) {
                return null;
            }
        }

        // Only persisted, administrator-controlled addresses and assigned ports are used.
        // Request parameters never choose a host, port or protocol.
        $host = $server->node->query_address ?: $query->ip;
        $statusHost = $server->node->query_address ?: $primary->ip;
        $resolveHost = function (string $address) use ($server): string {
            if (in_array($address, ['127.0.0.1', '::1', '0.0.0.0', '::'], true)) {
                return config('game-query.local_container_queries') && $server->node->fqdn === 'wings.localhost'
                    ? $server->uuid : $server->node->fqdn;
            }

            return $address;
        };

        return [
            'queryHost' => $resolveHost($host),
            'queryPort' => (int) $query->port,
            'statusHost' => $resolveHost($statusHost),
            'statusPort' => (int) $primary->port,
        ];
    }

    public function supports(Server $server): bool
    {
        $type = $server->game_query_type ?? 'auto';
        $name = $server->egg->name;
        if ($type === 'none' || $type === 'protocol-minecraftbedrock') {
            return false;
        }
        if ($type !== 'protocol-minecraftvanilla' && ($type !== 'auto'
            || preg_match('/bedrock|pocketmine|nukkit/i', $name)
            || !preg_match('/minecraft|paper|purpur|spigot|bungeecord|waterfall|velocity|forge|fabric|sponge|folia/i', $name))) {
            return false;
        }
        return true;
    }
}
