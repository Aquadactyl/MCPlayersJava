<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use Symfony\Component\Process\Process;

class QueryRunner
{
    public function query(array $target): array
    {
        try {
            $process = new Process([
                config('game-query.node_binary', 'node'),
                '--max-old-space-size=96',
                base_path('.blueprint/extensions/mcplayers/private/query.mjs'),
            ], base_path());
            $process->setInput(json_encode($target, JSON_THROW_ON_ERROR));
            $process->setTimeout(6)->run();
            $result = json_decode($process->getOutput(), true, 10, JSON_THROW_ON_ERROR);
            if ($process->isSuccessful() && $this->valid($result)) {
                return $result;
            }
        } catch (\Throwable) {
            // Timeout, malformed replies and missing runtimes produce a recoverable UI state.
        }

        return ['status' => 'unavailable', 'source' => null, 'complete' => false, 'online' => null, 'maximum' => null, 'players' => []];
    }

    private function valid(mixed $result): bool
    {
        if (!is_array($result) || ($result['status'] ?? null) !== 'available'
            || !in_array($result['source'] ?? null, ['query', 'status'], true)
            || !is_bool($result['complete'] ?? null)
            || !is_int($result['online'] ?? null) || $result['online'] < 0 || $result['online'] > 1000000
            || !is_int($result['maximum'] ?? null) || $result['maximum'] < 0 || $result['maximum'] > 1000000
            || !is_array($result['players'] ?? null) || count($result['players']) > 10000) {
            return false;
        }
        if ($result['complete'] && ($result['source'] !== 'query' || count($result['players']) !== $result['online'])) {
            return false;
        }
        foreach ($result['players'] as $player) {
            if (!is_array($player) || !is_string($player['name'] ?? null)
                || !preg_match('/\A[A-Za-z0-9_]{1,16}\z/', $player['name'])
                || !array_key_exists('uuid', $player)
                || ($player['uuid'] !== null && (!is_string($player['uuid'])
                    || !preg_match('/\A[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/i', $player['uuid'])))) {
                return false;
            }
        }

        return true;
    }
}
