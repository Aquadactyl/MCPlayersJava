<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use Pterodactyl\Models\Server;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class InventoryService
{
    public function __construct(private PlayerFiles $files, private NbtReader $reader, private InventorySnapshot $snapshots)
    {
    }

    public function read(Server $server, string $name, ?string $knownUuid = null): array
    {
        if (!preg_match('/\A[A-Za-z0-9_]{1,16}\z/', $name)) {
            throw new HttpException(422, 'Enter a valid Minecraft Java username.');
        }
        $properties = $this->files->read($server, '/server.properties', 65536);
        $world = $this->world($properties);
        $uuid = null;
        $cache = $this->optionalJson($server, '/usercache.json');
        foreach ($cache ?? [] as $player) {
            if (is_array($player) && strcasecmp((string) ($player['name'] ?? ''), $name) === 0 && $this->uuid($player['uuid'] ?? null)) {
                $uuid = strtolower($player['uuid']);
                $name = (string) $player['name'];
                break;
            }
        }
        // Server identity takes priority over Mojang skin identity on offline-mode servers.
        $uuid ??= $this->uuid($knownUuid) ? strtolower($knownUuid) : $this->offlineUuid($name);
        $directory = '/' . $world . '/playerdata';
        $entries = $this->files->directory($server, $directory);
        $entry = null;
        foreach ($entries as $candidate) {
            if (($candidate['name'] ?? null) === $uuid . '.dat' && ($candidate['file'] ?? true) && !($candidate['symlink'] ?? false)) {
                $entry = $candidate;
                break;
            }
        }
        if ($entry === null) {
            throw new HttpException(404, 'No saved inventory was found. The player may not have joined yet, or their UUID is missing from usercache.json.');
        }
        if ((int) ($entry['size'] ?? 0) > 2097152) {
            throw new HttpException(413, 'This saved player file is too large to inspect.');
        }
        $content = $this->files->read($server, $directory . '/' . $uuid . '.dat', 2097152);
        try {
            $snapshot = $this->snapshots->fromNbt($this->reader->parse($content));
        } catch (\UnexpectedValueException $exception) {
            throw new HttpException(422, 'The saved player data is invalid, unsupported or exceeds the inspection limits.', $exception);
        }

        return $snapshot + [
            'source' => 'saved_file', 'player' => $name, 'uuid' => $uuid,
            'saved_at' => is_string($entry['modified'] ?? null) ? $entry['modified'] : null,
            'read_at' => now()->toIso8601String(),
            'state' => [
                'operator' => $this->listed($server, '/ops.json', $name, $uuid),
                'banned' => $this->listed($server, '/banned-players.json', $name, $uuid),
                'whitelisted' => $this->listed($server, '/whitelist.json', $name, $uuid),
            ],
        ];
    }

    public function world(string $properties): string
    {
        preg_match('/^\s*level-name\s*[=:]\s*([^\r\n]*)/m', $properties, $matches);
        $world = trim($matches[1] ?? 'world');
        $world = preg_replace_callback('/\\\\u([0-9a-f]{4})/i', fn ($match) => mb_chr(hexdec($match[1]), 'UTF-8'), $world);
        $world = preg_replace_callback('/\\\\(.)/s', fn ($match) => match ($match[1]) {
            't' => "\t", 'n' => "\n", 'r' => "\r", 'f' => "\f", default => $match[1],
        }, $world);
        if ($world === '' || strlen($world) > 240 || str_starts_with($world, '/') || str_contains($world, '\\')
            || str_contains($world, ':') || preg_match('/[\p{C}\p{Zl}\p{Zp}]/u', $world)
            || array_any(explode('/', $world), fn ($part) => in_array($part, ['', '.', '..'], true))) {
            throw new HttpException(422, 'The configured world path cannot be inspected safely.');
        }

        return $world;
    }

    public function offlineUuid(string $name): string
    {
        $hex = md5('OfflinePlayer:' . $name);
        $hex[12] = '3';
        $hex[16] = dechex((hexdec($hex[16]) & 3) | 8);

        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }

    private function uuid(mixed $value): bool
    {
        return is_string($value) && preg_match('/\A[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/i', $value) === 1;
    }

    private function optionalJson(Server $server, string $path): ?array
    {
        try {
            $value = json_decode($this->files->read($server, $path, 2097152), true, 16, JSON_THROW_ON_ERROR);

            return is_array($value) && array_is_list($value) ? array_slice($value, 0, 10000) : null;
        } catch (DaemonConnectionException|\JsonException|HttpException) {
            return null;
        }
    }

    private function listed(Server $server, string $path, string $name, string $uuid): ?bool
    {
        $entries = $this->optionalJson($server, $path);
        if ($entries === null) {
            return null;
        }

        return array_any($entries, fn ($entry) => is_array($entry)
            && ((isset($entry['uuid']) && strcasecmp((string) $entry['uuid'], $uuid) === 0)
                || (isset($entry['name']) && strcasecmp((string) $entry['name'], $name) === 0)));
    }
}
