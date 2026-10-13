<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcplayers;

use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;
use Pterodactyl\Models\Server;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PlayerFiles
{
    public function __construct(private DaemonFileRepository $files)
    {
    }

    public function read(Server $server, string $path, int $limit): string
    {
        try {
            $response = $this->files->setServer($server)->getHttpClient()->get(
                '/api/servers/' . $server->uuid . '/files/contents',
                ['query' => ['file' => $path], 'stream' => true]
            );
            $stream = $response->getBody();
            $content = '';
            try {
                while (!$stream->eof()) {
                    $content .= $stream->read(min(8192, $limit + 1 - strlen($content)));
                    if (strlen($content) > $limit) {
                        throw new HttpException(413, 'This saved player file is too large to inspect.');
                    }
                }
            } finally {
                $stream->close();
            }

            return $content;
        } catch (TransferException $exception) {
            throw new DaemonConnectionException($exception);
        }
    }

    public function directory(Server $server, string $path): array
    {
        return $this->files->setServer($server)->getDirectory($path);
    }
}
